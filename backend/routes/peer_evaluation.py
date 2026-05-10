from flask import Blueprint, request, session
from config import get_db
from helpers import json_error, json_success, require_login, require_lecturer, log_activity, is_group_member

peer_evaluation_bp = Blueprint("peer_evaluation", __name__)


@peer_evaluation_bp.get("/peer-evaluation/<int:group_id>")
@require_login
def get_peers(group_id):
    if session.get("role") == "student" and not is_group_member(group_id, session["user_id"]):
        return json_error("You are not a member of this group", 403)
    with get_db() as conn:
        members = conn.execute(
            """
            SELECT u.user_id, u.name, u.email
            FROM group_members gm
            JOIN users u ON gm.user_id = u.user_id
            WHERE gm.group_id = ? AND gm.user_id != ?
            ORDER BY u.name
            """,
            (group_id, session["user_id"]),
        ).fetchall()
        done = conn.execute(
            """
            SELECT evaluatee_id FROM peer_evaluations
            WHERE group_id = ? AND evaluator_id = ?
            """,
            (group_id, session["user_id"]),
        ).fetchall()
    done_ids = {r["evaluatee_id"] for r in done}
    for member in members:
        member["already_evaluated"] = member["user_id"] in done_ids
    return json_success(members)


@peer_evaluation_bp.post("/peer-evaluation/<int:group_id>")
@require_login
def submit_evaluation(group_id):
    data = request.get_json() or {}
    evaluatee_id = data.get("evaluatee_id") or data.get("evaluated_user_id")
    rating = data.get("rating")
    comment = data.get("comment") or data.get("feedback") or ""
    anonymous = 1 if data.get("anonymous", False) else 0

    if not evaluatee_id or rating is None:
        return json_error("evaluatee_id and rating are required", 400)
    try:
        evaluatee_id = int(evaluatee_id)
        rating = float(rating)
    except ValueError:
        return json_error("evaluatee_id and rating must be numeric", 400)
    if evaluatee_id == session["user_id"]:
        return json_error("You cannot evaluate yourself", 400)
    if not (0 <= rating <= 5):
        return json_error("Rating must be between 0 and 5", 400)
    if session.get("role") == "student" and not is_group_member(group_id, session["user_id"]):
        return json_error("You are not a member of this group", 403)
    if not is_group_member(group_id, evaluatee_id):
        return json_error("Evaluated user is not a member of this group", 400)

    try:
        with get_db() as conn:
            cur = conn.execute(
                """
                INSERT INTO peer_evaluations (evaluator_id, evaluatee_id, group_id, rating, comment, anonymous)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (session["user_id"], evaluatee_id, group_id, rating, comment, anonymous),
            )
            conn.commit()
            evaluation_id = cur.lastrowid
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            return json_error("You already evaluated this member", 409)
        return json_error(f"Could not submit peer evaluation: {exc}", 500)

    log_activity(session["user_id"], "Submitted peer evaluation", f"group_{group_id}")
    return json_success({"evaluation_id": evaluation_id}, "Peer evaluation submitted successfully", 201)


@peer_evaluation_bp.get("/peer-evaluation/<int:group_id>/results")
@require_lecturer
def get_results(group_id):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT pe.evaluation_id, pe.rating, pe.comment, pe.anonymous, pe.submitted_at,
                   CASE WHEN pe.anonymous = 1 THEN 'Anonymous' ELSE evaluator.name END AS evaluator_name,
                   evaluatee.name AS evaluatee_name,
                   pe.evaluator_id,
                   pe.evaluatee_id
            FROM peer_evaluations pe
            JOIN users evaluator ON pe.evaluator_id = evaluator.user_id
            JOIN users evaluatee ON pe.evaluatee_id = evaluatee.user_id
            WHERE pe.group_id = ?
            ORDER BY pe.submitted_at DESC
            """,
            (group_id,),
        ).fetchall()
    return json_success(rows)
