from flask import Blueprint, request, session
from config import get_db
from helpers import json_error, json_success, require_login, require_lecturer, log_activity

groups_bp = Blueprint("groups", __name__)


@groups_bp.get("/groups/<int:project_id>")
@require_login
def get_groups(project_id):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM project_groups WHERE project_id = ?", (project_id,)).fetchall()
    return json_success(rows)


@groups_bp.post("/groups/<int:project_id>")
@require_lecturer
def create_group(project_id):
    data = request.get_json() or {}
    group_name = (data.get("group_name") or "").strip()
    if not group_name:
        return json_error("group_name is required", 400)
    with get_db() as conn:
        project = conn.execute("SELECT project_id FROM projects WHERE project_id = ?", (project_id,)).fetchone()
        if not project:
            return json_error("Project not found", 404)
        cur = conn.execute(
            "INSERT INTO project_groups (project_id, group_name) VALUES (?, ?)",
            (project_id, group_name),
        )
        conn.commit()
        group_id = cur.lastrowid
    log_activity(session["user_id"], f"Created group: {group_name}", f"group_{group_id}")
    return json_success({"group_id": group_id}, "Group created", 201)


@groups_bp.post("/groups/<int:group_id>/members")
@require_lecturer
def add_member(group_id):
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    user_id = data.get("user_id")
    if not email and not user_id:
        return json_error("email or user_id is required", 400)

    with get_db() as conn:
        group = conn.execute("SELECT group_id FROM project_groups WHERE group_id = ?", (group_id,)).fetchone()
        if not group:
            return json_error("Group not found", 404)
        if user_id:
            user = conn.execute("SELECT user_id, name FROM users WHERE user_id = ?", (user_id,)).fetchone()
        else:
            user = conn.execute("SELECT user_id, name FROM users WHERE email = ?", (email,)).fetchone()
        if not user:
            return json_error("User not found", 404)
        try:
            conn.execute(
                "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
                (group_id, user["user_id"]),
            )
            conn.commit()
        except Exception:
            return json_error("User is already in this group", 409)
    log_activity(session["user_id"], f"Added {user['name']} to group", f"group_{group_id}")
    return json_success({"user_id": user["user_id"]}, f"{user['name']} added to group", 201)


@groups_bp.get("/groups/<int:group_id>/members")
@require_login
def get_members(group_id):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT u.user_id, u.name, u.email, u.role, gm.joined_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.user_id
            WHERE gm.group_id = ?
            ORDER BY u.name
            """,
            (group_id,),
        ).fetchall()
    return json_success(rows)


@groups_bp.delete("/groups/<int:group_id>/members/<int:user_id>")
@require_lecturer
def remove_member(group_id, user_id):
    with get_db() as conn:
        conn.execute("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user_id))
        conn.commit()
    log_activity(session["user_id"], "Removed member from group", f"group_{group_id}")
    return json_success(message="Member removed from group")
