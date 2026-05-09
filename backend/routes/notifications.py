# routes/notifications.py
from flask import Blueprint, jsonify

notification_routes = Blueprint('notifications', __name__)

@notification_routes.route("/notifications")
def get_notifications():
    return jsonify([
        {"msg": "Task deadline tomorrow"},
        {"msg": "New submission uploaded"}
    ])