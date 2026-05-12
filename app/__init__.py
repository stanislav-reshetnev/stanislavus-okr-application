import os
from flask import Flask, request, jsonify, redirect, url_for
from flask_login import LoginManager

from app.config import Config, ROOT
from app.database import close_db, get_db

login_manager = LoginManager()


def create_app():
    app = Flask(__name__,
                template_folder=os.path.join(ROOT, 'templates'),
                static_folder=os.path.join(ROOT, 'static'),
                static_url_path='/static')
    app.config.from_object(Config)
    Config.init_app(app)

    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.session_protection = None

    @login_manager.unauthorized_handler
    def unauthorized():
        if request.is_json or request.path.startswith('/api/'):
            return jsonify({"error": "unauthorized"}), 401
        return redirect(url_for('auth.login'))

    @login_manager.user_loader
    def load_user(user_id):
        from app.models.user import User
        db = get_db()
        user = User.get_by_id(db, user_id)
        return user

    @app.before_request
    def check_setup():
        if request.path.startswith('/static/'):
            return
        if request.endpoint and request.endpoint.startswith('auth.'):
            return
        db = get_db()
        from app.models.user import User
        if User.count(db) == 0:
            return redirect(url_for('auth.setup'))

    app.teardown_appcontext(close_db)

    from app.routes.teams import teams_bp
    from app.routes.managers import managers_bp
    from app.routes.objectives import objectives_bp
    from app.routes.key_results import key_results_bp
    from app.routes.frontend import frontend_bp
    from app.routes.auth import auth_bp

    app.register_blueprint(teams_bp)
    app.register_blueprint(managers_bp)
    app.register_blueprint(objectives_bp)
    app.register_blueprint(key_results_bp)
    app.register_blueprint(frontend_bp)
    app.register_blueprint(auth_bp)

    return app
