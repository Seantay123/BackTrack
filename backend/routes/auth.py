# routes/auth.py
from flask import Blueprint, request, jsonify

auth_routes = Blueprint('auth', __name__)

users = []

@auth_routes.route("/register", methods=["POST"])
def register():
    data = request.json
    users.append(data)
    return jsonify({"message": "User registered"})

@auth_routes.route("/login", methods=["POST"])
def login():
    data = request.json
    for user in users:
        if user["email"] == data["email"]:
            return jsonify({"message": "Login success", "role": user.get("role", "student")})
    return jsonify({"error": "User not found"}), 404