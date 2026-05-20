from flask import Blueprint, request, render_template, redirect, url_for
from flask_login import login_user, logout_user
from werkzeug.security import check_password_hash

from app.database import get_db
from app.models.user import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/setup', methods=['GET', 'POST'])
def setup():
    db = get_db()
    if User.count(db) > 0:
        return redirect(url_for('auth.login'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm', '')

        if not email or not password:
            return render_template('setup.html', error='Email and password are required.')
        if password != confirm:
            return render_template('setup.html', error='Passwords do not match.')

        user = User.create(db, email, password, role='admin')
        login_user(user)
        return redirect(url_for('frontend.index'))

    return render_template('setup.html')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    db = get_db()
    if User.count(db) == 0:
        return redirect(url_for('auth.setup'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        user = User.get_by_email(db, email)
        if user is None or not check_password_hash(user.password_hash, password):
            return render_template('login.html', error='Invalid email or password.')

        login_user(user)
        user.update_last_login(db)
        return redirect(url_for('frontend.index'))

    return render_template('login.html')


@auth_bp.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('auth.login'))
