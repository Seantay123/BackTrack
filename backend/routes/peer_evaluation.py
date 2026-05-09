from flask import Blueprint, request, jsonify, session
from config import get_db

peer_evaluation_bp = Blueprint('peer_evaluation', __name__)

# --- Helpers ---
def require_login():
    if 'user_id' not in session:
        return jsonify({'error': 'Please log in'}), 401

def require_instructor():
    if session.get('role') not in ('instructor', 'admin'):
        return jsonify({'error': 'Only instructors can perform this action'}), 403

# --- Routes ---
@peer_evaluation_bp.route('/peer-evaluation/<int:group_id>', methods=['GET'])
def get_peers(group_id):
    if (resp := require_login()): return resp

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("""
            SELECT u.user_id, u.name, u.email
            FROM group_members gm
            JOIN users u ON gm.user_id = u.user_id
            WHERE gm.group_id = %s AND gm.user_id != %s
        """, (group_id, session['user_id']))
        members = cur.fetchall()

        cur.execute("""
            SELECT evaluatee_id FROM peer_evaluations
            WHERE group_id = %s AND evaluator_id = %s
        """, (group_id, session['user_id']))
        already_done = {r['evaluatee_id'] for r in cur.fetchall()}

    for m in members:
        m['already_evaluated'] = m['user_id'] in already_done
    return jsonify(members)

@peer_evaluation_bp.route('/peer-evaluation/<int:group_id>', methods=['POST'])
def submit_evaluation(group_id):
    if (resp := require_login()): return resp

    data = request.get_json() or {}
    evaluatee_id, rating, comment = data.get('evaluatee_id'), data.get('rating'), data.get('comment', '')

    # Validation
    if not evaluatee_id or rating is None:
        return jsonify({'error': 'evaluatee_id and rating are required'}), 400
    if evaluatee_id == session['user_id']:
        return jsonify({'error': 'You cannot evaluate yourself'}), 400
    try:
        rating = float(rating)
    except ValueError:
        return jsonify({'error': 'Rating must be a number'}), 400
    if not (0 <= rating <= 5):
        return jsonify({'error': 'Rating must be between 0 and 5'}), 400

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("""
            SELECT 1 FROM peer_evaluations
            WHERE group_id = %s AND evaluator_id = %s AND evaluatee_id = %s
        """, (group_id, session['user_id'], evaluatee_id))
        if cur.fetchone():
            return jsonify({'error': 'You already evaluated this member'}), 400

        cur.execute("""
            INSERT INTO peer_evaluations (evaluator_id, evaluatee_id, group_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
        """, (session['user_id'], evaluatee_id, group_id, rating, comment))

        cur.execute("""
            INSERT INTO activity_logs (user_id, action, entity)
            VALUES (%s, %s, %s)
        """, (session['user_id'], 'Submitted peer evaluation', f'group_{group_id}'))

        conn.commit()
    return jsonify({'message': 'Peer evaluation submitted successfully'}), 201

@peer_evaluation_bp.route('/peer-evaluation/<int:group_id>/results', methods=['GET'])
def get_results(group_id):
    if (resp := require_login()): return resp
    if (resp := require_instructor()): return resp

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("""
            SELECT 
                pe.evaluation_id,
                pe.rating,
                pe.comment,
                pe.submitted_at,
                evaluator.name AS evaluator_name,
                evaluatee.name AS evaluatee_name
            FROM peer_evaluations pe
            JOIN users evaluator ON pe.evaluator_id = evaluator.user_id
            JOIN users evaluatee ON pe.evaluatee_id = evaluatee.user_id
            WHERE pe.group_id = %s
            ORDER BY pe.submitted_at DESC
        """, (group_id,))
        results = cur.fetchall()
    return jsonify(results)
