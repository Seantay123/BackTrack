from flask import Blueprint
from config import get_db
from helpers import json_success, require_login
from routes.scores import calculate_group_scores

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.get("/analytics/project/<int:project_id>")
@require_login
def project_analytics(project_id):
    with get_db() as conn:
        task_stats = conn.execute(
            """
            SELECT COUNT(*) AS total_tasks,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
                   SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
                   SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) AS not_started_tasks
            FROM tasks WHERE project_id = ?
            """,
            (project_id,),
        ).fetchone()
        groups = conn.execute("SELECT group_id, group_name FROM project_groups WHERE project_id = ?", (project_id,)).fetchall()
        submission_count = conn.execute(
            """
            SELECT COUNT(*) AS total
            FROM submissions s JOIN tasks t ON s.task_id = t.task_id
            WHERE t.project_id = ?
            """,
            (project_id,),
        ).fetchone()["total"]
        activity_count = conn.execute(
            """
            SELECT COUNT(*) AS total
            FROM activity_logs al
            LEFT JOIN tasks t ON al.entity = 'task_' || t.task_id
            WHERE t.project_id = ? OR al.entity = 'project_' || ?
            """,
            (project_id, project_id),
        ).fetchone()["total"]
    total = task_stats["total_tasks"] or 0
    completed = task_stats["completed_tasks"] or 0
    project_progress = round((completed / total) * 100, 2) if total else 0
    group_scores = []
    for group in groups:
        group_scores.append({"group_id": group["group_id"], "group_name": group["group_name"], "scores": calculate_group_scores(group["group_id"])})
    return json_success({
        "project_id": project_id,
        "project_progress": project_progress,
        "task_stats": task_stats,
        "submission_count": submission_count,
        "activity_count": activity_count,
        "group_scores": group_scores,
    })
