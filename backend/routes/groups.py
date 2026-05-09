from flask import Blueprint, request, jsonify, session
from config import get_db

groups_bp = Blueprint('groups', __name__)

# --- Helpers ---
def require_login():
    if 'user_id' not in session:
        return jsonify({'error': 'Please log in'}), 401

def require_instructor():
    if session.get('role') not in ('instructor', 'admin'):
        return jsonify({'error': 'Only instructors can perform this action'}), 403

# --- Routes ---
@groups_bp.route('/groups/<int:project_id>', methods=['GET'])
def get_groups(project_id):
    if (resp := require_login()): return resp
    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("SELECT * FROM project_groups WHERE project_id = %s", (project_id,))
        return jsonify(cur.fetchall())

@groups_bp.route('/groups/<int:project_id>', methods=['POST'])
def create_group(project_id):
    if (resp := require_login()): return resp
    if (resp := require_instructor()): return resp

    data = request.get_json() or {}
    if not data.get('group_name'):
        return jsonify({'error': 'group_name is required'}), 400

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("INSERT INTO project_groups (project_id, group_name) VALUES (%s, %s)",
                    (project_id, data['group_name']))
        conn.commit()
        return jsonify({'message': 'Group created', 'group_id': cur.lastrowid}), 201

@groups_bp.route('/groups/<int:group_id>/members', methods=['POST'])
def add_member(group_id):
    if (resp := require_login()): return resp
    if (resp := require_instructor()): return resp

    email = (request.get_json() or {}).get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'email is required'}), 400

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("SELECT user_id, name FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        cur.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s",
                    (group_id, user['user_id']))
        if cur.fetchone():
            return jsonify({'error': 'User is already in this group'}), 400

        cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)",
                    (group_id, user['user_id']))
        conn.commit()
        return jsonify({'message': f'{user["name"]} added to group'}), 201

@groups_bp.route('/groups/<int:group_id>/members', methods=['GET'])
def get_members(group_id):
    if (resp := require_login()): return resp
    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("""
            SELECT u.user_id, u.name, u.email, u.role
            FROM group_members gm
            JOIN users u ON gm.user_id = u.user_id
            WHERE gm.group_id = %s
        """, (group_id,))
        return jsonify(cur.fetchall())

@groups_bp.route('/groups/<int:group_id>/members/<int:uid>', methods=['DELETE'])
def remove_member(group_id, uid):
    if (resp := require_login()): return resp
    if (resp := require_instructor()): return resp

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("DELETE FROM group_members WHERE group_id = %s AND user_id = %s",
                    (group_id, uid))
        conn.commit()
        return jsonify({'message': 'Member removed from group'})
