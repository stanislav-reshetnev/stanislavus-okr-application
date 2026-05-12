from flask import Blueprint, render_template, current_app
from flask_login import login_required, current_user

frontend_bp = Blueprint('frontend', __name__)


@frontend_bp.route('/')
@login_required
def index():
    return render_template('index.html',
                           company_name=current_app.config.get('COMPANY_NAME', 'Company'),
                           current_user=current_user)
