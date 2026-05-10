from flask import Blueprint, request, session
from config import get_db
from helpers import json_error, json_success, require_login, require_lecturer, log_activity

projects_bp = Blueprint("projects", __name__)


@projects_bp.get("/projects")
@require_login
def get_projects():
    with get_db() as conn:
        if session.get("role") in ("lecturer", "admin"):
            rows = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        else:
            rows = conn.execute(
                """
                SELECT DISTINCT p.*
                FROM projects p
                JOIN project_groups pg ON p.project_id = pg.project_id
                JOIN group_members gm ON pg.group_id = gm.group_id
                WHERE gm.user_id = ?
                ORDER BY p.created_at DESC
                """,
                (session["user_id"],),
            ).fetchall()
    return json_success(rows)


@projects_bp.get("/projects/<int:project_id>")
@require_login
def get_project(project_id):
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT p.*, u.name AS created_by_name
            FROM projects p
            JOIN users u ON p.created_by = u.user_id
            WHERE p.project_id = ?
            """,
            (project_id,),
        ).fetchone()
    if not row:
        return json_error("Project not found", 404)
    return json_success(row)


@projects_bp.post("/projects")
@require_lecturer
def create_project():
    data = request.get_json() or {}
    project_name = (data.get("project_name") or data.get("title") or "").strip()
    if not project_name:
        return json_error("project_name is required", 400)

    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO projects (project_name, description, start_date, end_date, created_by)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                project_name,
                data.get("description"),
                data.get("start_date"),
                data.get("end_date"),
                session["user_id"],
            ),
        )
        conn.commit()
        project_id = cur.lastrowid
    log_activity(session["user_id"], f"Created project: {project_name}", f"project_{project_id}")
    return json_success({"project_id": project_id}, "Project created", 201)


@projects_bp.put("/projects/<int:project_id>")
@require_lecturer
def update_project(project_id):
    data = request.get_json() or {}
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,)).fetchone()
        if not existing:
            return json_error("Project not found", 404)
        conn.execute(
            """
            UPDATE projects
            SET project_name = ?, description = ?, start_date = ?, end_date = ?
            WHERE project_id = ?
            """,
            (
                data.get("project_name", existing["project_name"]),
                data.get("description", existing["description"]),
                data.get("start_date", existing["start_date"]),
                data.get("end_date", existing["end_date"]),
                project_id,
            ),
        )
        conn.commit()
    log_activity(session["user_id"], "Updated project", f"project_{project_id}")
    return json_success(message="Project updated")


@projects_bp.delete("/projects/<int:project_id>")
@require_lecturer
def delete_project(project_id):
    with get_db() as conn:
        conn.execute("DELETE FROM projects WHERE project_id = ?", (project_id,))
        conn.commit()
    log_activity(session["user_id"], "Deleted project", f"project_{project_id}")
    return json_success(message="Project deleted")
