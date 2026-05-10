from flask import Blueprint
from config import get_db
from helpers import json_success, require_login
from routes.scores import calculate_group_scores

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/reports/project/<int:project_id>")
@require_login
def project_report(project_id):
    with get_db() as conn:
        project = conn.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,)).fetchone()
        if not project:
            return json_success({"message": "Project not found"}, status=404)
        groups = conn.execute("SELECT * FROM project_groups WHERE project_id = ?", (project_id,)).fetchall()
        task_summary = conn.execute(
            """
            SELECT status, COUNT(*) AS count
            FROM tasks WHERE project_id = ? GROUP BY status
            """,
            (project_id,),
        ).fetchall()
    report_groups = []
    for group in groups:
        report_groups.append({
            "group_id": group["group_id"],
            "group_name": group["group_name"],
            "contribution_scores": calculate_group_scores(group["group_id"]),
        })
    return json_success({
        "project": project,
        "task_summary": task_summary,
        "groups": report_groups,
        "report_note": "Contribution Score = 40% Task Completion + 30% Activity Logs + 30% Peer Evaluation",
    })
