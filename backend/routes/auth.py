from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from config import get_db
from helpers import json_error, json_success, log_activity, require_login

auth_routes = Blueprint("auth", __name__)


def normalize_role(role):
    role = (role or "student").lower().strip()
    if role == "instructor":
        role = "lecturer"
    if role not in ("student", "lecturer", "admin"):
        role = "student"
    return role


@auth_routes.post("/register")
def register():
    data = request.get_json() or {}
    name = (data.get("name") or data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = normalize_role(data.get("role"))

    if not name or not email or not password:
        return json_error("name, email and password are required", 400)
    if len(password) < 6:
        return json_error("Password must be at least 6 characters", 400)

    password_hash = generate_password_hash(password)
    try:
        with get_db() as conn:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
                (name, email, password_hash, role),
            )
            conn.commit()
            user_id = cur.lastrowid
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            return json_error("Email already registered", 409)
        return json_error(f"Registration failed: {exc}", 500)

    session["user_id"] = user_id
    session["name"] = name
    session["role"] = role
    log_activity(user_id, "Registered account", f"user_{user_id}")
    return json_success({"user_id": user_id, "name": name, "email": email, "role": role}, "User registered", 201)


@auth_routes.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return json_error("email and password are required", 400)

    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user or not check_password_hash(user["password_hash"], password):
        return json_error("Invalid email or password", 401)

    session["user_id"] = user["user_id"]
    session["name"] = user["name"]
    session["role"] = user["role"]
    log_activity(user["user_id"], "Logged in", f"user_{user['user_id']}")
    return json_success({"user_id": user["user_id"], "name": user["name"], "email": user["email"], "role": user["role"]}, "Login success")


@auth_routes.post("/logout")
@require_login
def logout():
    uid = session.get("user_id")
    session.clear()
    if uid:
        log_activity(uid, "Logged out", f"user_{uid}")
    return json_success(message="Logged out")


@auth_routes.get("/me")
@require_login
def me():
    return json_success({"user_id": session["user_id"], "name": session.get("name"), "role": session.get("role")})
