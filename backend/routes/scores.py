from flask import Blueprint, jsonify, session
from config import get_db

scores_bp = Blueprint('scores', __name__)

# Score weights
WEIGHT_TASK     = 0.40
WEIGHT_ACTIVITY = 0.30
WEIGHT_PEER     = 0.30

# --- Helpers ---
def require_login():
    if 'user_id' not in session:
        return jsonify({'error': 'Please log in'}), 401

def calc_task_score(cur, group_id, uid):
    cur.execute("""
        SELECT COUNT(*) AS total, SUM(status = 'completed') AS done
        FROM tasks WHERE group_id = %s AND assigned_to = %s
    """, (group_id, uid))
    t = cur.fetchone()
    return round((t['done'] or 0) / t['total'] * 100, 2) if t['total'] else 0

def calc_activity_score(cur, group_id, uid):
    cur.execute("""
        SELECT COUNT(*) AS cnt
        FROM activity_logs al
        JOIN tasks tk ON al.entity = CONCAT('task_', tk.task_id)
        WHERE tk.group_id = %s AND al.user_id = %s
    """, (group_id, uid))
    user_logs = cur.fetchone()['cnt']

    cur.execute("""
        SELECT MAX(log_count) AS max_logs FROM (
            SELECT COUNT(*) AS log_count
            FROM activity_logs al
            JOIN tasks tk ON al.entity = CONCAT('task_', tk.task_id)
            WHERE tk.group_id = %s
            GROUP BY al.user_id
        ) AS counts
    """, (group_id,))
    max_logs = cur.fetchone()['max_logs'] or 0
    return round(user_logs / max_logs * 100, 2) if max_logs > 0 else 0

def calc_peer_score(cur, group_id, uid):
    cur.execute("""
        SELECT AVG(rating) AS avg_rating
        FROM peer_evaluations
        WHERE group_id = %s AND evaluatee_id = %s
    """, (group_id, uid))
    p = cur.fetchone()
    return round(float(p['avg_rating']) * 20, 2) if p['avg_rating'] else 0

def calc_final_score(task, activity, peer):
    return round(
        WEIGHT_TASK * task +
        WEIGHT_ACTIVITY * activity +
        WEIGHT_PEER * peer,
        2
    )

# --- Routes ---
@scores_bp.route('/scores/<int:group_id>', methods=['GET'])
def get_group_scores(group_id):
    if (resp := require_login()): return resp

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("""
            SELECT u.user_id, u.name
            FROM group_members gm
            JOIN users u ON gm.user_id = u.user_id
            WHERE gm.group_id = %s
        """, (group_id,))
        members = cur.fetchall()

        results = []
        for m in members:
            uid = m['user_id']
            task     = calc_task_score(cur, group_id, uid)
            activity = calc_activity_score(cur, group_id, uid)
            peer     = calc_peer_score(cur, group_id, uid)
            final    = calc_final_score(task, activity, peer)

            results.append({
                'user_id': uid,
                'name': m['name'],
                'task_score': task,
                'activity_score': activity,
                'peer_score': peer,
                'final_score': final,
                'formula': '40% Task + 30% Activity + 30% Peer'
            })

    # Sort and rank
    results.sort(key=lambda x: x['final_score'], reverse=True)
    for i, r in enumerate(results, 1):
        r['rank'] = i
    return jsonify(results)

@scores_bp.route('/scores/<int:group_id>/me', methods=['GET'])
def get_my_score(group_id):
    if (resp := require_login()): return resp

    uid = session['user_id']
    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        task     = calc_task_score(cur, group_id, uid)
        activity = calc_activity_score(cur, group_id, uid)
        peer     = calc_peer_score(cur, group_id, uid)
        final    = calc_final_score(task, activity, peer)

    return jsonify({
        'user_id': uid,
        'task_score': task,
        'activity_score': activity,
        'peer_score': peer,
        'final_score': final,
        'formula': '40% Task + 30% Activity + 30% Peer'
    })
