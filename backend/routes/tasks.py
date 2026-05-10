from flask import Blueprint, request, session
from config import get_db
from helpers import json_error, json_success, require_login, require_lecturer, log_activity

task_routes = Blueprint("tasks", __name__)

VALID_STATUSES = {"not_started", "in_progress", "completed"}


def normalize_status(status):
    if not status:
        return "not_started"
    return status.strip().lower().replace(" ", "_").replace("-", "_")


@task_routes.get("/tasks")
@require_login
def get_tasks():
    project_id = request.args.get("project_id", type=int)
    group_id = request.args.get("group_id", type=int)
    assigned_to = request.args.get("assigned_to", type=int)
    status = request.args.get("status")

    params = []
    where = []

    if session.get("role") == "student":
        where.append("(t.assigned_to = ? OR t.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?))")
        params.extend([session["user_id"], session["user_id"]])
    if project_id:
        where.append("t.project_id = ?")
        params.append(project_id)
    if group_id:
        where.append("t.group_id = ?")
        params.append(group_id)
    if assigned_to:
        where.append("t.assigned_to = ?")
        params.append(assigned_to)
    if status:
        where.append("t.status = ?")
        params.append(normalize_status(status))

    sql = """
        SELECT t.*, p.project_name, g.group_name, u.name AS assigned_to_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.project_id
        LEFT JOIN project_groups g ON t.group_id = g.group_id
        LEFT JOIN users u ON t.assigned_to = u.user_id
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY t.due_date IS NULL, t.due_date, t.created_at DESC"

    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return json_success(rows)


@task_routes.get("/tasks/<int:task_id>")
@require_login
def get_task(task_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
    if not row:
        return json_error("Task not found", 404)
    return json_success(row)


@task_routes.post("/tasks")
@require_lecturer
def create_task():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    project_id = data.get("project_id")
    if not title or not project_id:
        return json_error("title and project_id are required", 400)

    status = normalize_status(data.get("status"))
    if status not in VALID_STATUSES:
        return json_error("Invalid status", 400)

    with get_db() as conn:
        project = conn.execute("SELECT project_id FROM projects WHERE project_id = ?", (project_id,)).fetchone()
        if not project:
            return json_error("Project not found", 404)
        assigned_to = data.get("assigned_to") or data.get("assigned_user_id")
        if assigned_to:
            user = conn.execute("SELECT user_id FROM users WHERE user_id = ?", (assigned_to,)).fetchone()
            if not user:
                return json_error("Assigned user not found", 404)
        cur = conn.execute(
            """
            INSERT INTO tasks (project_id, group_id, assigned_to, title, description, status, due_date, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                data.get("group_id"),
                assigned_to,
                title,
                data.get("description"),
                status,
                data.get("due_date"),
                session["user_id"],
            ),
        )
        conn.commit()
        task_id = cur.lastrowid
    log_activity(session["user_id"], f"Created task: {title}", f"task_{task_id}")
    return json_success({"task_id": task_id}, "Task created", 201)


@task_routes.patch("/tasks/<int:task_id>/status")
@require_login
def update_task_status(task_id):
    data = request.get_json() or {}
    status = normalize_status(data.get("status"))
    if status not in VALID_STATUSES:
        return json_error("Invalid status", 400)

    with get_db() as conn:
        task = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
        if not task:
            return json_error("Task not found", 404)
        if session.get("role") == "student" and task["assigned_to"] != session["user_id"]:
            return json_error("You can only update tasks assigned to you", 403)
        conn.execute(
            "UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE task_id = ?",
            (status, task_id),
        )
        conn.commit()
    log_activity(session["user_id"], f"Updated task status to {status}", f"task_{task_id}")
    return json_success({"task_id": task_id, "status": status}, "Task status updated")


@task_routes.put("/tasks/<int:task_id>")
@require_lecturer
def update_task(task_id):
    data = request.get_json() or {}
    with get_db() as conn:
        task = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
        if not task:
            return json_error("Task not found", 404)
        status = normalize_status(data.get("status", task["status"]))
        if status not in VALID_STATUSES:
            return json_error("Invalid status", 400)
        conn.execute(
            """
            UPDATE tasks
            SET title = ?, description = ?, assigned_to = ?, group_id = ?, status = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE task_id = ?
            """,
            (
                data.get("title", task["title"]),
                data.get("description", task["description"]),
                data.get("assigned_to", task["assigned_to"]),
                data.get("group_id", task["group_id"]),
                status,
                data.get("due_date", task["due_date"]),
                task_id,
            ),
        )
        conn.commit()
    log_activity(session["user_id"], "Updated task", f"task_{task_id}")
    return json_success(message="Task updated")


@task_routes.delete("/tasks/<int:task_id>")
@require_lecturer
def delete_task(task_id):
    with get_db() as conn:
        conn.execute("DELETE FROM tasks WHERE task_id = ?", (task_id,))
        conn.commit()
    log_activity(session["user_id"], "Deleted task", f"task_{task_id}")
    return json_success(message="Task deleted")
