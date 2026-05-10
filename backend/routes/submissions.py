from flask import Blueprint, request, session
from config import get_db
from helpers import json_error, json_success, require_login, log_activity

submissions_bp = Blueprint("submissions", __name__)


@submissions_bp.post("/submissions")
@require_login
def create_submission():
    data = request.get_json() or {}
    task_id = data.get("task_id")
    if not task_id:
        return json_error("task_id is required", 400)

    file_url = data.get("file_url") or data.get("file")
    text_content = data.get("text_content") or data.get("description") or data.get("content")
    if not file_url and not text_content:
        return json_error("file_url or text_content is required", 400)

    with get_db() as conn:
        task = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
        if not task:
            return json_error("Task not found", 404)
        if session.get("role") == "student" and task["assigned_to"] != session["user_id"]:
            return json_error("You can only submit work for tasks assigned to you", 403)
        cur = conn.execute(
            """
            INSERT INTO submissions (task_id, user_id, file_url, text_content)
            VALUES (?, ?, ?, ?)
            """,
            (task_id, session["user_id"], file_url, text_content),
        )
        conn.execute(
            "UPDATE tasks SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE task_id = ?",
            (task_id,),
        )
        conn.commit()
        submission_id = cur.lastrowid
    log_activity(session["user_id"], "Submitted project work", f"task_{task_id}")
    return json_success({"submission_id": submission_id, "task_id": task_id}, "Work submitted successfully", 201)


@submissions_bp.get("/submissions")
@require_login
def list_submissions():
    task_id = request.args.get("task_id", type=int)
    user_id = request.args.get("user_id", type=int)
    params = []
    where = []
    if task_id:
        where.append("s.task_id = ?")
        params.append(task_id)
    if user_id:
        where.append("s.user_id = ?")
        params.append(user_id)
    if session.get("role") == "student":
        where.append("s.user_id = ?")
        params.append(session["user_id"])

    sql = """
        SELECT s.*, t.title AS task_title, u.name AS submitted_by
        FROM submissions s
        JOIN tasks t ON s.task_id = t.task_id
        JOIN users u ON s.user_id = u.user_id
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY s.submitted_at DESC"
    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return json_success(rows)


@submissions_bp.get("/submissions/<int:task_id>")
@require_login
def get_submissions_by_task(task_id):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT s.*, u.name AS submitted_by
            FROM submissions s
            JOIN users u ON s.user_id = u.user_id
            WHERE s.task_id = ?
            ORDER BY s.submitted_at DESC
            """,
            (task_id,),
        ).fetchall()
    return json_success(rows)
