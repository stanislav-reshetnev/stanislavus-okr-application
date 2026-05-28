import importlib
import json
import os
from urllib.parse import urlparse
from flask import request, jsonify, redirect, url_for
from flask_login import LoginManager

import connexion
from connexion.options import SwaggerUIOptions
from connexion.resolver import Resolver
from app.config import Config, ROOT
from app.database import close_db, get_db


login_manager = LoginManager()


_LOCAL_HOSTS = {'localhost', '127.0.0.1', '::1', '0.0.0.0'}


def _is_origin_allowed(origin, host_header, scheme):
    """Check if origin should get CORS headers."""
    from urllib.parse import urlparse
    allowed = set(Config.get_cors_origins())
    if origin in allowed:
        return True
    o = urlparse(origin)
    host_part = host_header.split(':')[0]
    if o.hostname in _LOCAL_HOSTS and host_part in _LOCAL_HOSTS:
        return True
    return False


def create_app():
    connexion_app = connexion.FlaskApp(
        __name__,
        server_args={
            'template_folder': os.path.join(ROOT, 'templates'),
            'static_folder': os.path.join(ROOT, 'static'),
            'static_url_path': '/static',
        }
    )
    app = connexion_app.app
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

    @login_manager.request_loader
    def load_user_from_request(request):
        from app.models.user import User
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            db = get_db()
            return User.get_by_api_token(db, token)
        return None

    @app.before_request
    def check_setup():
        if request.path.startswith('/static/'):
            return
        if request.path == '/openapi.json':
            return
        if request.endpoint and request.endpoint.startswith('auth.'):
            return
        db = get_db()
        from app.models.user import User
        if User.count(db) == 0:
            return redirect(url_for('auth.setup'))

    app.teardown_appcontext(close_db)

    spec_path = os.path.join(ROOT, 'openapi.json')
    with open(spec_path) as f:
        spec = json.load(f)
    spec['servers'] = [{"url": Config.APP_HOST, "description": "API server"}]
    app.openapi_spec = spec

    OPERATION_MODULE = {
        'getUsers': 'app.handlers.auth',
        'createUser': 'app.handlers.auth',
        'updateUser': 'app.handlers.auth',
        'deleteUser': 'app.handlers.auth',
        'changePassword': 'app.handlers.auth',
        'getTeams': 'app.handlers.teams',
        'createTeam': 'app.handlers.teams',
        'updateTeam': 'app.handlers.teams',
        'deleteTeam': 'app.handlers.teams',
        'getManagers': 'app.handlers.managers',
        'createManager': 'app.handlers.managers',
        'updateManager': 'app.handlers.managers',
        'deleteManager': 'app.handlers.managers',
        'getTree': 'app.handlers.objectives',
        'getObjectivesFlat': 'app.handlers.objectives',
        'createObjective': 'app.handlers.objectives',
        'reorderObjectives': 'app.handlers.objectives',
        'updateObjective': 'app.handlers.objectives',
        'deleteObjective': 'app.handlers.objectives',
        'createKeyResult': 'app.handlers.key_results',
        'reorderKeyResults': 'app.handlers.key_results',
        'updateKeyResult': 'app.handlers.key_results',
        'deleteKeyResult': 'app.handlers.key_results',
        'createInitiative': 'app.handlers.initiatives',
        'reorderInitiatives': 'app.handlers.initiatives',
        'updateInitiative': 'app.handlers.initiatives',
        'deleteInitiative': 'app.handlers.initiatives',
    }

    def _resolve_fn(operation_id):
        module_path = OPERATION_MODULE.get(operation_id)
        if module_path:
            module = importlib.import_module(module_path)
            return getattr(module, operation_id)
        raise ImportError(f'Cannot resolve operationId: {operation_id}')

    connexion_app.add_api(
        spec,
        resolver=Resolver(_resolve_fn),
        pythonic_params=False,
        strict_validation=True,
        validate_responses=False,
        swagger_ui_options=SwaggerUIOptions(
            swagger_ui=False,
            serve_spec=False,
        ),
    )

    # Register page-route blueprints only
    from app.routes.frontend import frontend_bp
    from app.routes.auth import auth_bp

    app.register_blueprint(frontend_bp)
    app.register_blueprint(auth_bp)

    # Wrap middleware with CORS handling at the outermost ASGI layer
    _allowed_origins = set(Config.get_cors_origins())
    _original_middleware = connexion_app.middleware

    async def _cors_wrapper(scope, receive, send):
        if scope['type'] != 'http':
            return await _original_middleware(scope, receive, send)

        from starlette.datastructures import Headers
        headers = Headers(scope=scope)
        origin = headers.get('origin', '')
        is_allowed = origin and (
            origin in _allowed_origins
            or _is_origin_allowed(origin, headers.get('host', ''), scope.get('scheme', 'http'))
        )

        if not is_allowed:
            return await _original_middleware(scope, receive, send)

        _cors_bin_headers = [
            (b'access-control-allow-origin', origin.encode()),
            (b'access-control-allow-credentials', b'true'),
            (b'access-control-allow-methods', b'GET, POST, PUT, DELETE, OPTIONS'),
            (b'access-control-allow-headers', b'Content-Type, Authorization'),
        ]
        _cors_str_headers = {
            'access-control-allow-origin': origin,
            'access-control-allow-credentials': 'true',
            'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'access-control-allow-headers': 'Content-Type, Authorization',
        }

        if scope.get('method') == 'OPTIONS':
            from starlette.responses import Response
            resp = Response('', status_code=200, headers=_cors_str_headers)
            return await resp(scope, receive, send)

        async def send_with_cors(message):
            if message['type'] == 'http.response.start':
                message['headers'] = message.get('headers', []) + _cors_bin_headers
            await send(message)

        return await _original_middleware(scope, receive, send_with_cors)

    connexion_app.middleware = _cors_wrapper

    return connexion_app
