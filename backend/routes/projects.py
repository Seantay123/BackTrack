from flask import Blueprint, request, jsonify, session
from config import get_db

projects_bp = Blueprint('projects', __name__)

# --- Helpers ---
def require_login():
    if 'user_id' not in session:
        return jsonify({'error': 'Please log in'}), 401

def require_instructor():
    if session.get('role') not in ('instructor', 'admin'):
        return jsonify({'error': 'Only instructors can perform this action'}), 403

# --- Routes ---
@projects_bp.route('/projects', methods=['GET'])
def get_projects():
    if (resp := require_login()): return resp

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        if session.get('role') in ('instructor', 'admin'):
            cur.execute("SELECT * FROM projects ORDER BY start_date DESC")
        else:
            cur.execute("""
                SELECT DISTINCT p.*
                FROM projects p
                JOIN project_groups pg ON p.project_id = pg.project_id
                JOIN group_members gm  ON pg.group_id  = gm.group_id
                WHERE gm.user_id = %s
                ORDER BY p.start_date DESC
            """, (session['user_id'],))
        return jsonify(cur.fetchall())

@projects_bp.route('/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    if (resp := require_login()): return resp

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("""
            SELECT p.*, u.name AS created_by_name
            FROM projects p
            JOIN users u ON p.created_by = u.user_id
            WHERE p.project_id = %s
        """, (project_id,))
        project = cur.fetchone()

    if not project:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(project)

@projects_bp.route('/projects', methods=['POST'])
def create_project():
    if (resp := require_login()): return resp
    if (resp := require_instructor()): return resp

    data = request.get_json() or {}
    if not data.get('project_name'):
        return jsonify({'error': 'project_name is required'}), 400

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("""
            INSERT INTO projects (project_name, description, start_date, end_date, created_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data['project_name'],
            data.get('description'),
            data.get('start_date'),
            data.get('end_date'),
            session['user_id']
        ))
        conn.commit()
        project_id = cur.lastrowid

        cur.execute("""
            INSERT INTO activity_logs (user_id, action, entity)
            VALUES (%s, %s, %s)
        """, (session['user_id'], f"Created project: {data['project_name']}", f'project_{project_id}'))
        conn.commit()

    return jsonify({'message': 'Project created', 'project_id': project_id}), 201

@projects_bp.route('/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    if (resp := require_login()): return resp
    if (resp := require_instructor()): return resp

    data = request.get_json() or {}
    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("""
            UPDATE projects
            SET project_name = %s,
                description  = %s,
                start_date   = %s,
                end_date     = %s
            WHERE project_id = %s
        """, (
            data.get('project_name'),
            data.get('description'),
            data.get('start_date'),
            data.get('end_date'),
            project_id
        ))
        conn.commit()
    return jsonify({'message': 'Project updated'})

@projects_bp.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    if (resp := require_login()): return resp
    if (resp := require_instructor()): return resp

    with get_db() as conn, conn.cursor(dictionary=True) as cur:
        cur.execute("DELETE FROM projects WHERE project_id = %s", (project_id,))
        conn.commit()
    return jsonify({'message': 'Project deleted'})
