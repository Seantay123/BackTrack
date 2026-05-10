from functools import wraps
from flask import jsonify, session
from config import get_db


def json_error(message, status=400):
    return jsonify({"success": False, "error": message}), status


def json_success(data=None, message="OK", status=200):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status


def current_user_id():
    return session.get("user_id")


def current_role():
    return session.get("role")


def require_login(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return json_error("Please log in", 401)
        return fn(*args, **kwargs)
    return wrapper


def require_lecturer(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return json_error("Please log in", 401)
        if session.get("role") not in ("lecturer", "admin"):
            return json_error("Only lecturers can perform this action", 403)
        return fn(*args, **kwargs)
    return wrapper


def log_activity(user_id, action, entity=None):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO activity_logs (user_id, action, entity) VALUES (?, ?, ?)",
            (user_id, action, entity),
        )
        conn.commit()


def is_group_member(group_id, user_id):
    with get_db() as conn:
        row = conn.execute(
            "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?",
            (group_id, user_id),
        ).fetchone()
    return row is not None
