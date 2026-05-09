# routes/tasks.py
from flask import Blueprint, jsonify

task_routes = Blueprint('tasks', __name__)

@task_routes.route("/tasks")
def get_tasks():
    return jsonify([
        {"task_id": 1, "title": "Frontend UI", "status": "In Progress"},
        {"task_id": 2, "title": "Backend API", "status": "Completed"}
    ])