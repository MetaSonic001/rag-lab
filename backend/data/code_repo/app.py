"""Application entry point: builds the Flask app and registers blueprints."""
from flask import Flask

from config import Settings
from db import init_db
from auth.routes import auth_bp
from routes.tasks import tasks_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Settings)

    init_db(app.config["DATABASE_URL"])

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(tasks_bp, url_prefix="/tasks")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    create_app().run(port=5000)
