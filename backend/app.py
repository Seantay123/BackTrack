from flask import Flask
from flask_cors import CORS
from routes.auth import auth_routes
from routes.tasks import task_routes
from routes.notifications import notification_routes

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///backtrack.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.register_blueprint(auth_routes, url_prefix="/api")
app.register_blueprint(task_routes, url_prefix="/api")
app.register_blueprint(notification_routes, url_prefix="/api")

if __name__ == "__main__":
    app.run(debug=True)