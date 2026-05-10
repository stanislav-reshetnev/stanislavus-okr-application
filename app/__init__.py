import os

from flask import Flask

from app.config import Config, ROOT
from app.database import close_db


def create_app():
    app = Flask(__name__,
                template_folder=os.path.join(ROOT, 'templates'),
                static_folder=os.path.join(ROOT, 'static'),
                static_url_path='/static')
    app.config.from_object(Config)

    app.teardown_appcontext(close_db)

    from app.routes.teams import teams_bp
    from app.routes.managers import managers_bp
    from app.routes.objectives import objectives_bp
    from app.routes.key_results import key_results_bp
    from app.routes.frontend import frontend_bp

    app.register_blueprint(teams_bp)
    app.register_blueprint(managers_bp)
    app.register_blueprint(objectives_bp)
    app.register_blueprint(key_results_bp)
    app.register_blueprint(frontend_bp)

    return app
