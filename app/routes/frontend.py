from flask import Blueprint, render_template, current_app, jsonify
from flask_login import login_required, current_user

frontend_bp = Blueprint('frontend', __name__)


@frontend_bp.route('/openapi.json')
def serve_openapi():
    return jsonify(current_app.openapi_spec)

@frontend_bp.route('/api/docs')
@login_required
def swagger_ui():
    return render_template('swagger.html',
                           company_name=current_app.config.get('COMPANY_NAME', 'Company'))

@frontend_bp.route('/')
@login_required
def index():
    return render_template('index.html',
                           company_name=current_app.config.get('COMPANY_NAME', 'Company'),
                           app_host=current_app.config.get('APP_HOST', 'http://localhost:5000'),
                           current_user=current_user)
