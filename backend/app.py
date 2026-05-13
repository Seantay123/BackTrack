from flask import Flask, request, jsonify, session
from flask_cors import CORS
import mysql.connector
import bcrypt
from datetime import datetime

app = Flask(__name__)
app.secret_key = "backtrack_secret_key"
CORS(app, supports_credentials=True)

# Database connection
def get_db():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Dameka@41",       
        database="backtrack_db"
    )
    return conn

# Alias for compatibility with frontend code
def get_db_connection():
    return get_db()


# AUTH ROUTES

# POST /register
@app.route("/register", methods=["POST"])
def register():
    data     = request.get_json()
    name     = data["name"]
    email    = data["email"]
    password = data["password"]
    role     = data["role"]   # student, lecturer, admin

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    # Check if email already exists
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    existing = cur.fetchone()
    if existing:
        cur.close()
        conn.close()
        return jsonify({"error": "Email already registered"}), 400

    # Hash the password
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    cur.execute(
        "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
        (name, email, hashed, role)
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Account created successfully"}), 201


# POST /login
@app.route("/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = data["email"]
    password = data["password"]

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        return jsonify({"error": "Email not found"}), 401

    # Check password
    if not bcrypt.checkpw(password.encode(), user["password"].encode()):
        return jsonify({"error": "Wrong password"}), 401

    # Save user info in session
    session["user_id"] = user["user_id"]
    session["name"]    = user["name"]
    session["role"]    = user["role"]

    return jsonify({
        "message": "Login successful",
        "user": {
            "user_id": user["user_id"],
            "name":    user["name"],
            "email":   user["email"],
            "role":    user["role"]
        }
    })


# POST /logout
@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


# PROJECT ROUTES

# GET /projects  — list all projects for the logged-in user
@app.route("/projects", methods=["GET"])
def get_projects():
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    if session["role"] in ("lecturer", "admin"):
        cur.execute("SELECT * FROM projects")
    else:
        cur.execute("""
            SELECT DISTINCT p.*
            FROM projects p
            JOIN project_groups pg ON p.project_id = pg.project_id
            JOIN group_members gm  ON pg.group_id  = gm.group_id
            WHERE gm.user_id = %s
        """, (session["user_id"],))

    projects = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(projects)


# POST /projects  — create a new project (lecturer/admin only)
@app.route("/projects", methods=["POST"])
def create_project():
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] not in ("lecturer", "admin"):
        return jsonify({"error": "Only lecturers can create projects"}), 403

    data = request.get_json()
    required_fields = ["project_name"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    try:
        cur.execute("""
            INSERT INTO projects (project_name, description, start_date, end_date, created_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data["project_name"],
            data.get("description"),
            data.get("start_date"),
            data.get("end_date"),
            session["user_id"]
        ))
        conn.commit()
        project_id = cur.lastrowid
        cur.close()
        conn.close()
        return jsonify({"message": "Project created", "project_id": project_id}), 201
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({"error": str(e)}), 500


# GROUP ROUTES

# GET /projects/<pid>/groups  — list groups in a project
@app.route("/projects/<int:pid>/groups", methods=["GET"])
def get_groups(pid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM project_groups WHERE project_id = %s", (pid,))
    groups = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(groups)


# POST /projects/<pid>/groups  — create a group (lecturer/admin only)
@app.route("/projects/<int:pid>/groups", methods=["POST"])
def create_group(pid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] not in ("lecturer", "admin"):
        return jsonify({"error": "Only lecturers can create groups"}), 403

    try:
        data = request.get_json()
        if not data or "group_name" not in data:
            return jsonify({"error": "Group name is required"}), 400

        conn = get_db()
        cur = conn.cursor(dictionary=True)
        
        # Check if project exists
        cur.execute("SELECT * FROM projects WHERE project_id = %s", (pid,))
        project = cur.fetchone()
        if not project:
            cur.close()
            conn.close()
            return jsonify({"error": f"Project with id {pid} does not exist"}), 404
        
        cur.execute(
            "INSERT INTO project_groups (project_id, group_name) VALUES (%s, %s)",
            (pid, data["group_name"])
        )
        conn.commit()
        group_id = cur.lastrowid
        cur.close()
        conn.close()
        
        return jsonify({"message": "Group created", "group_id": group_id}), 201
        
    except Exception as e:
        print(f"Error creating group: {str(e)}")
        return jsonify({"error": str(e)}), 500


# POST /groups/<gid>/members  — add a student to a group by email
@app.route("/groups/<int:gid>/members", methods=["POST"])
def add_member(gid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] not in ("lecturer", "admin"):
        return jsonify({"error": "Only lecturers can add members"}), 403

    data  = request.get_json()
    if not data or "email" not in data:
        return jsonify({"error": "Email is required"}), 400
    
    email = data["email"]

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT user_id FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    if not user:
        cur.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404

    # Check if already a member
    cur.execute(
        "SELECT * FROM group_members WHERE group_id = %s AND user_id = %s",
        (gid, user["user_id"])
    )
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"error": "User is already a member of this group"}), 400

    cur.execute(
        "INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)",
        (gid, user["user_id"])
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Member added"}), 201


# GET /groups/<gid>/members  — list members of a group
@app.route("/groups/<int:gid>/members", methods=["GET"])
def get_members(gid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT u.user_id, u.name, u.email, u.role
        FROM group_members gm
        JOIN users u ON gm.user_id = u.user_id
        WHERE gm.group_id = %s
    """, (gid,))
    members = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(members)


# TASK ROUTES

# GET /groups/<gid>/tasks  — list all tasks in a group
@app.route("/groups/<int:gid>/tasks", methods=["GET"])
def get_tasks(gid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT t.*, u.name AS assignee_name
        FROM tasks t
        JOIN users u ON t.assigned_to = u.user_id
        WHERE t.group_id = %s
        ORDER BY t.deadline ASC
    """, (gid,))
    tasks = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tasks)


# POST /groups/<gid>/tasks  — create a task (lecturer/admin only)
@app.route("/groups/<int:gid>/tasks", methods=["POST"])
def create_task(gid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] not in ("lecturer", "admin"):
        return jsonify({"error": "Only lecturers can create tasks"}), 403

    data = request.get_json()
    if not data or "assigned_to" not in data or "title" not in data:
        return jsonify({"error": "Missing required fields: assigned_to, title"}), 400

    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    
    try:
        cur.execute("""
            INSERT INTO tasks (group_id, assigned_to, title, description, deadline, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
        """, (gid, data["assigned_to"], data["title"], data.get("description"), data.get("deadline")))
        conn.commit()
        task_id = cur.lastrowid

        # Log the activity
        cur.execute(
            "INSERT INTO activity_logs (user_id, action, entity) VALUES (%s, %s, %s)",
            (session["user_id"], f"Created task: {data['title']}", f"task_{task_id}")
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Task created", "task_id": task_id}), 201
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({"error": str(e)}), 500


# PUT /tasks/<int:task_id>/submit  — student submits a task 
@app.route('/tasks/<int:task_id>/submit', methods=['PUT', 'PATCH'])
def submit_task(task_id):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        file_link = data.get('file_link')
        if not file_link:
            return jsonify({"error": "File link is required"}), 400
        
        conn = get_db()  # ✅ Fixed: using get_db() not get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if task exists and belongs to this student
        cursor.execute("""
            SELECT t.*, u.name as student_name 
            FROM tasks t
            JOIN users u ON t.assigned_to = u.user_id
            WHERE t.task_id = %s
        """, (task_id,))
        
        task = cursor.fetchone()
        if not task:
            cursor.close()
            conn.close()
            return jsonify({"error": "Task not found"}), 404
        
        # Check if the logged-in student is the assigned person
        if task["assigned_to"] != session["user_id"]:
            cursor.close()
            conn.close()
            return jsonify({"error": "This task is not assigned to you"}), 403
        
        # Check if task is already completed
        if task["status"] == "completed":
            cursor.close()
            conn.close()
            return jsonify({"error": "Task is already completed"}), 400
        
        # Update the task - Using %s for MySQL (not ?)
        cursor.execute('''
            UPDATE tasks 
            SET status = 'submitted', 
                file_link = %s, 
                submitted_at = %s
            WHERE task_id = %s
        ''', (file_link, datetime.now(), task_id))
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Task submitted successfully",
            "task_id": task_id,
            "status": "submitted"
        }), 200
        
    except Exception as e:
        print(f"Error in submit_task: {str(e)}")
        return jsonify({"error": str(e)}), 500


# PUT /tasks/<int:task_id>/review  — lecturer reviews a submission
@app.route('/tasks/<int:task_id>/review', methods=['PUT'])
def review_task(task_id):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] not in ("lecturer", "admin"):
        return jsonify({"error": "Only lecturers can review tasks"}), 403
    
    try:
        data = request.get_json()
        new_status = data.get('status')  # 'completed' or 'pending'
        comment = data.get('comment', '')
        grade = data.get('grade')
        
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        # Get task details
        cursor.execute("SELECT * FROM tasks WHERE task_id = %s", (task_id,))
        task = cursor.fetchone()
        
        if not task:
            cursor.close()
            conn.close()
            return jsonify({"error": "Task not found"}), 404
        
        # Update the task
        if new_status == 'completed':
            cursor.execute('''
                UPDATE tasks 
                SET status = 'completed', 
                    completed_at = %s,
                    grade = %s,
                    feedback = %s
                WHERE task_id = %s
            ''', (datetime.now(), grade, comment, task_id))
        else:
            cursor.execute('''
                UPDATE tasks 
                SET status = 'pending', 
                    file_link = NULL,
                    submitted_at = NULL,
                    feedback = %s
                WHERE task_id = %s
            ''', (comment, task_id))
        
        conn.commit()
        
        # Log the activity
        action = "Approved and completed" if new_status == 'completed' else "Rejected and sent back"
        cursor.execute(
            "INSERT INTO activity_logs (user_id, action, entity) VALUES (%s, %s, %s)",
            (session["user_id"], f"{action} task: {task['title']}", f"task_{task_id}")
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": f"Task {new_status if new_status == 'completed' else 'rejected'} successfully",
            "task_id": task_id,
            "status": new_status
        }), 200
        
    except Exception as e:
        print(f"Error in review_task: {str(e)}")
        return jsonify({"error": str(e)}), 500


# GET /tasks/submitted  — get all submitted tasks for lecturer review
@app.route("/tasks/submitted", methods=["GET"])
def get_submitted_tasks():
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] not in ("lecturer", "admin"):
        return jsonify({"error": "Access denied"}), 403
    
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT t.*, u.name AS student_name, pg.group_name
        FROM tasks t
        JOIN users u ON t.assigned_to = u.user_id
        JOIN project_groups pg ON t.group_id = pg.group_id
        WHERE t.status = 'submitted'
        ORDER BY t.submitted_at DESC
    """)
    tasks = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tasks)


# PATCH /tasks/<tid>/verify  — lecturer marks task as completed (legacy)
@app.route("/tasks/<int:tid>/verify", methods=["PATCH"])
def verify_task(tid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] not in ("lecturer", "admin"):
        return jsonify({"error": "Only lecturers can verify tasks"}), 403

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    cur.execute("UPDATE tasks SET status = 'completed', completed_at = %s WHERE task_id = %s", (datetime.now(), tid))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Task verified and marked as completed"})


# GET /groups/all  — get all groups for lecturer dashboard
@app.route("/groups/all", methods=["GET"])
def get_all_groups():
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] not in ("lecturer", "admin"):
        return jsonify({"error": "Access denied"}), 403
    
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT pg.*, p.project_name 
        FROM project_groups pg
        JOIN projects p ON pg.project_id = p.project_id
    """)
    groups = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(groups)


# GET /users/students  — get all students for teacher dashboard
@app.route("/users/students", methods=["GET"])
def get_students():
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] not in ("lecturer", "admin"):
        return jsonify({"error": "Access denied"}), 403
    
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT user_id, name, email, role FROM users WHERE role = 'student'")
    students = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(students)


# GET /api/me  — get current user info
@app.route("/api/me", methods=["GET"])
def get_current_user():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT user_id, name, email, role FROM users WHERE user_id = %s", (session["user_id"],))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    return jsonify({
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    })


# GET /student/tasks  — get tasks for the logged-in student
@app.route("/student/tasks", methods=["GET"])
def get_student_tasks():
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] != "student":
        return jsonify({"error": "Access denied"}), 403
    
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT t.*, pg.group_name
        FROM tasks t
        JOIN project_groups pg ON t.group_id = pg.group_id
        WHERE t.assigned_to = %s
        ORDER BY t.deadline ASC
    """, (session["user_id"],))
    tasks = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tasks)


# GET /student/groups  — get groups for the logged-in student
@app.route("/student/groups", methods=["GET"])
def get_student_groups():
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401
    if session["role"] != "student":
        return jsonify({"error": "Access denied"}), 403
    
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT pg.*, p.project_name
        FROM group_members gm
        JOIN project_groups pg ON gm.group_id = pg.group_id
        JOIN projects p ON pg.project_id = p.project_id
        WHERE gm.user_id = %s
    """, (session["user_id"],))
    groups = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(groups)


# PEER EVALUATION ROUTES

# GET /groups/<gid>/peer-evaluation  — get teammates to evaluate
@app.route("/groups/<int:gid>/peer-evaluation", methods=["GET"])
def get_peer_form(gid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    # Get all group members except the current user
    cur.execute("""
        SELECT u.user_id, u.name, u.email
        FROM group_members gm
        JOIN users u ON gm.user_id = u.user_id
        WHERE gm.group_id = %s AND gm.user_id != %s
    """, (gid, session["user_id"]))
    members = cur.fetchall()

    # Check which ones the user already evaluated
    cur.execute("""
        SELECT evaluatee_id FROM peer_evaluations
        WHERE group_id = %s AND evaluator_id = %s
    """, (gid, session["user_id"]))
    done_rows    = cur.fetchall()
    already_done = {r["evaluatee_id"] for r in done_rows}

    for m in members:
        m["already_evaluated"] = m["user_id"] in already_done

    cur.close()
    conn.close()
    return jsonify(members)


# POST /groups/<gid>/peer-evaluation  — submit a peer evaluation
@app.route("/groups/<int:gid>/peer-evaluation", methods=["POST"])
def submit_peer_eval(gid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    data         = request.get_json()
    evaluatee_id = data["evaluatee_id"]
    rating       = float(data["rating"])   # 0.00 to 5.00
    comment      = data.get("comment", "")

    if evaluatee_id == session["user_id"]:
        return jsonify({"error": "You cannot evaluate yourself"}), 400
    if not (0 <= rating <= 5):
        return jsonify({"error": "Rating must be between 0 and 5"}), 400

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    # Check if already evaluated
    cur.execute("""
        SELECT evaluation_id FROM peer_evaluations
        WHERE group_id = %s AND evaluator_id = %s AND evaluatee_id = %s
    """, (gid, session["user_id"], evaluatee_id))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"error": "You already evaluated this member"}), 400

    cur.execute("""
        INSERT INTO peer_evaluations (evaluator_id, evaluatee_id, group_id, rating, comment)
        VALUES (%s, %s, %s, %s, %s)
    """, (session["user_id"], evaluatee_id, gid, rating, comment))

    # Log the activity
    cur.execute(
        "INSERT INTO activity_logs (user_id, action, entity) VALUES (%s, %s, %s)",
        (session["user_id"], "Submitted peer evaluation", f"group_{gid}")
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "Peer evaluation submitted"}), 201


# CONTRIBUTION SCORE ROUTES

# GET /groups/<gid>/scores  — get all scores for a group
@app.route("/groups/<int:gid>/scores", methods=["GET"])
def get_scores(gid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    # Get all members in the group
    cur.execute("""
        SELECT u.user_id, u.name
        FROM group_members gm
        JOIN users u ON gm.user_id = u.user_id
        WHERE gm.group_id = %s
    """, (gid,))
    members = cur.fetchall()

    results = []
    for member in members:
        uid = member["user_id"]

        # --- Task Score (40%) ---
        cur.execute("""
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done
            FROM tasks
            WHERE group_id = %s AND assigned_to = %s
        """, (gid, uid))
        t = cur.fetchone()
        if t["total"] and t["total"] > 0:
            task_score = round((t["done"] or 0) / t["total"] * 100, 2)
        else:
            task_score = 0

        # --- Activity Score (30%) ---
        cur.execute("""
            SELECT COUNT(*) AS cnt
            FROM activity_logs al
            JOIN tasks tk ON al.entity = CONCAT('task_', tk.task_id)
            WHERE tk.group_id = %s AND al.user_id = %s
        """, (gid, uid))
        user_logs = cur.fetchone()["cnt"]

        # Get max logs among all members
        cur.execute("""
            SELECT MAX(log_count) AS max_logs FROM (
                SELECT COUNT(*) AS log_count
                FROM activity_logs al
                JOIN tasks tk ON al.entity = CONCAT('task_', tk.task_id)
                WHERE tk.group_id = %s
                GROUP BY al.user_id
            ) AS counts
        """, (gid,))
        max_logs = cur.fetchone()["max_logs"] or 0
        activity_score = round(user_logs / max_logs * 100, 2) if max_logs > 0 else 0

        # --- Peer Score (30%) ---
        cur.execute("""
            SELECT AVG(rating) AS avg_rating
            FROM peer_evaluations
            WHERE group_id = %s AND evaluatee_id = %s
        """, (gid, uid))
        p = cur.fetchone()
        peer_score = round(float(p["avg_rating"]) * 20, 2) if p["avg_rating"] else 0

        # --- Final Score ---
        final_score = round(
            0.40 * task_score +
            0.30 * activity_score +
            0.30 * peer_score,
            2
        )

        results.append({
            "user_id":        uid,
            "name":           member["name"],
            "task_score":     task_score,
            "activity_score": activity_score,
            "peer_score":     peer_score,
            "final_score":    final_score
        })

    # Sort by final score, highest first
    results.sort(key=lambda x: x["final_score"], reverse=True)
    for i, r in enumerate(results, 1):
        r["rank"] = i

    cur.close()
    conn.close()
    return jsonify(results)


# GET /groups/<gid>/scores/me  — get only the logged-in user's score
@app.route("/groups/<int:gid>/scores/me", methods=["GET"])
def get_my_score(gid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    uid = session["user_id"]

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    # Task score
    cur.execute("""
        SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done
        FROM tasks WHERE group_id = %s AND assigned_to = %s
    """, (gid, uid))
    t = cur.fetchone()
    task_score = round((t["done"] or 0) / t["total"] * 100, 2) if t["total"] else 0

    # Activity score
    cur.execute("""
        SELECT COUNT(*) AS cnt FROM activity_logs al
        JOIN tasks tk ON al.entity = CONCAT('task_', tk.task_id)
        WHERE tk.group_id = %s AND al.user_id = %s
    """, (gid, uid))
    user_logs = cur.fetchone()["cnt"]

    cur.execute("""
        SELECT MAX(log_count) AS max_logs FROM (
            SELECT COUNT(*) AS log_count FROM activity_logs al
            JOIN tasks tk ON al.entity = CONCAT('task_', tk.task_id)
            WHERE tk.group_id = %s GROUP BY al.user_id
        ) AS counts
    """, (gid,))
    max_logs = cur.fetchone()["max_logs"] or 0
    activity_score = round(user_logs / max_logs * 100, 2) if max_logs > 0 else 0

    # Peer score
    cur.execute("""
        SELECT AVG(rating) AS avg_rating FROM peer_evaluations
        WHERE group_id = %s AND evaluatee_id = %s
    """, (gid, uid))
    p = cur.fetchone()
    peer_score = round(float(p["avg_rating"]) * 20, 2) if p["avg_rating"] else 0

    final_score = round(0.40 * task_score + 0.30 * activity_score + 0.30 * peer_score, 2)

    cur.close()
    conn.close()
    return jsonify({
        "user_id":        uid,
        "task_score":     task_score,
        "activity_score": activity_score,
        "peer_score":     peer_score,
        "final_score":    final_score,
        "formula":        "40% Task + 30% Activity + 30% Peer"
    })


# ACTIVITY LOG ROUTE

# GET /groups/<gid>/activity  — recent activity in a group
@app.route("/groups/<int:gid>/activity", methods=["GET"])
def get_activity(gid):
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT al.log_id, al.action, al.entity, al.timestamp, u.name
        FROM activity_logs al
        JOIN users u ON al.user_id = u.user_id
        JOIN tasks t ON al.entity = CONCAT('task_', t.task_id)
        WHERE t.group_id = %s
        ORDER BY al.timestamp DESC
        LIMIT 50
    """, (gid,))
    logs = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(logs)


# DASHBOARD ROUTE

# GET /dashboard  — summary for the logged-in user
@app.route("/dashboard", methods=["GET"])
def dashboard():
    if "user_id" not in session:
        return jsonify({"error": "Please log in"}), 401

    uid  = session["user_id"]
    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    # Get all groups the user belongs to
    cur.execute("""
        SELECT pg.group_id, pg.group_name, p.project_id, p.project_name, p.end_date
        FROM group_members gm
        JOIN project_groups pg ON gm.group_id   = pg.group_id
        JOIN projects p        ON pg.project_id = p.project_id
        WHERE gm.user_id = %s
    """, (uid,))
    groups = cur.fetchall()

    for g in groups:
        gid = g["group_id"]

        # Task summary
        cur.execute("""
            SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done
            FROM tasks WHERE group_id = %s AND assigned_to = %s
        """, (gid, uid))
        t = cur.fetchone()
        g["tasks_total"]     = t["total"]
        g["tasks_completed"] = int(t["done"] or 0)

        # Quick final score
        cur.execute("""
            SELECT AVG(rating) AS avg_r FROM peer_evaluations
            WHERE group_id = %s AND evaluatee_id = %s
        """, (gid, uid))
        p = cur.fetchone()
        peer_score = round(float(p["avg_r"]) * 20, 2) if p["avg_r"] else 0

        task_score = round(g["tasks_completed"] / g["tasks_total"] * 100, 2) if g["tasks_total"] else 0
        g["my_score"] = round(0.40 * task_score + 0.30 * 0 + 0.30 * peer_score, 2)

    cur.close()
    conn.close()
    return jsonify(groups)


# HOME ROUTE
@app.route('/')
def home():
    return jsonify({
        "message": "BackTrack API is running",
        "status": "online",
        "endpoints": {
            "register": "POST /register",
            "login": "POST /login",
            "projects": "GET /projects",
            "dashboard": "GET /dashboard",
            "submit_task": "PUT /tasks/<id>/submit",
            "review_task": "PUT /tasks/<id>/review"
        }
    })


# ──────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)