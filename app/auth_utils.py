from functools import wraps

from flask import request, jsonify, abort
from flask_login import current_user


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if current_user.role not in roles:
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({"error": "forbidden"}), 403
                abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator
