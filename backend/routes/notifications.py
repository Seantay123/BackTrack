from flask import Blueprint
from helpers import json_success, require_login
from config import get_db

notification_routes = Blueprint("notifications", __name__)


@notification_routes.get("/notifications")
@require_login
def get_notifications():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT task_id, title, due_date, status
            FROM tasks
            WHERE status != 'completed'
            ORDER BY due_date IS NULL, due_date
            LIMIT 5
            """
        ).fetchall()
    return json_success([{"msg": f"Task pending: {r['title']}", **r} for r in rows])
