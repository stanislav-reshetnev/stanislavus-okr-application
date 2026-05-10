from flask import Blueprint, render_template, current_app

frontend_bp = Blueprint('frontend', __name__)


@frontend_bp.route('/')
def index():
    return render_template('index.html', company_name=current_app.config.get('COMPANY_NAME', 'Company'))
