from flask import Flask
from flask_cors import CORS
from config import init_db

from routes.auth import auth_routes
from routes.projects import projects_bp
from routes.groups import groups_bp
from routes.tasks import task_routes
from routes.submissions import submissions_bp
from routes.peer_evaluation import peer_evaluation_bp
from routes.scores import scores_bp
from routes.analytics import analytics_bp
from routes.reports import reports_bp
from routes.notifications import notification_routes


def create_app():
    app = Flask(__name__)
    app.secret_key = "replace-this-secret-key"
    CORS(app, supports_credentials=True)

    init_db()

    app.register_blueprint(auth_routes, url_prefix="/api")
    app.register_blueprint(projects_bp, url_prefix="/api")
    app.register_blueprint(groups_bp, url_prefix="/api")
    app.register_blueprint(task_routes, url_prefix="/api")
    app.register_blueprint(submissions_bp, url_prefix="/api")
    app.register_blueprint(peer_evaluation_bp, url_prefix="/api")
    app.register_blueprint(scores_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api")
    app.register_blueprint(reports_bp, url_prefix="/api")
    app.register_blueprint(notification_routes, url_prefix="/api")

    @app.route("/")
    def home():
        return "BackTrack Running"


    @app.get("/api/health")
    def health():
        return {"success": True, "message": "BackTrack backend running"}

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
