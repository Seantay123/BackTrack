from flask import Blueprint, session
from config import get_db
from helpers import json_success, require_login

scores_bp = Blueprint("scores", __name__)

WEIGHT_TASK = 0.40
WEIGHT_ACTIVITY = 0.30
WEIGHT_PEER = 0.30


def calc_task_score(cur, group_id, uid):
    row = cur.execute(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done
        FROM tasks
        WHERE group_id = ? AND assigned_to = ?
        """,
        (group_id, uid),
    ).fetchone()
    return round(((row["done"] or 0) / row["total"]) * 100, 2) if row and row["total"] else 0


def calc_activity_score(cur, group_id, uid):
    row = cur.execute(
        """
        SELECT COUNT(*) AS cnt
        FROM activity_logs al
        LEFT JOIN tasks t ON al.entity = 'task_' || t.task_id
        WHERE al.user_id = ? AND (t.group_id = ? OR al.entity = 'group_' || ?)
        """,
        (uid, group_id, group_id),
    ).fetchone()
    user_logs = row["cnt"] or 0
    max_row = cur.execute(
        """
        SELECT MAX(log_count) AS max_logs
        FROM (
            SELECT al.user_id, COUNT(*) AS log_count
            FROM activity_logs al
            LEFT JOIN tasks t ON al.entity = 'task_' || t.task_id
            WHERE t.group_id = ? OR al.entity = 'group_' || ?
            GROUP BY al.user_id
        ) counts
        """,
        (group_id, group_id),
    ).fetchone()
    max_logs = (max_row or {}).get("max_logs") or 0
    return round((user_logs / max_logs) * 100, 2) if max_logs else 0


def calc_peer_score(cur, group_id, uid):
    row = cur.execute(
        "SELECT AVG(rating) AS avg_rating FROM peer_evaluations WHERE group_id = ? AND evaluatee_id = ?",
        (group_id, uid),
    ).fetchone()
    return round(float(row["avg_rating"]) * 20, 2) if row and row["avg_rating"] is not None else 0


def calc_final_score(task, activity, peer):
    return round((WEIGHT_TASK * task) + (WEIGHT_ACTIVITY * activity) + (WEIGHT_PEER * peer), 2)


def calculate_group_scores(group_id):
    with get_db() as conn:
        cur = conn.cursor()
        members = cur.execute(
            """
            SELECT u.user_id, u.name
            FROM group_members gm
            JOIN users u ON gm.user_id = u.user_id
            WHERE gm.group_id = ?
            ORDER BY u.name
            """,
            (group_id,),
        ).fetchall()
        results = []
        for member in members:
            uid = member["user_id"]
            task = calc_task_score(cur, group_id, uid)
            activity = calc_activity_score(cur, group_id, uid)
            peer = calc_peer_score(cur, group_id, uid)
            final = calc_final_score(task, activity, peer)
            results.append({
                "user_id": uid,
                "name": member["name"],
                "task_score": task,
                "activity_score": activity,
                "peer_score": peer,
                "final_score": final,
                "formula": "40% Task + 30% Activity + 30% Peer",
            })
    results.sort(key=lambda r: r["final_score"], reverse=True)
    for index, row in enumerate(results, 1):
        row["rank"] = index
    return results


@scores_bp.get("/scores/<int:group_id>")
@require_login
def get_group_scores(group_id):
    return json_success(calculate_group_scores(group_id))


@scores_bp.get("/scores/<int:group_id>/me")
@require_login
def get_my_score(group_id):
    scores = calculate_group_scores(group_id)
    mine = next((s for s in scores if s["user_id"] == session["user_id"]), None)
    return json_success(mine or {"message": "No score available"})
