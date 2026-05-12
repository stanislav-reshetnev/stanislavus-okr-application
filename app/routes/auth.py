from flask import Blueprint, request, jsonify, render_template, redirect, url_for
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash

from app.database import get_db
from app.models.user import User
from app.auth_utils import role_required

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


@auth_bp.route('/api/users', methods=['GET'])
@login_required
@role_required('admin')
def api_get_users():
    db = get_db()
    users = User.get_all(db)
    return jsonify([u.to_dict() for u in users])


@auth_bp.route('/api/users', methods=['POST'])
@login_required
@role_required('admin')
def api_create_user():
    data = request.json
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"error": "email and password required"}), 400

    db = get_db()
    existing = User.get_by_email(db, data['email'].strip())
    if existing:
        return jsonify({"error": "User with this email already exists"}), 409

    role = data.get('role', 'view')
    if role not in ('view', 'edit', 'admin'):
        role = 'view'

    user = User.create(db, data['email'].strip(), data['password'], role=role)
    return jsonify(user.to_dict()), 201


@auth_bp.route('/api/users/<user_id>', methods=['PUT'])
@login_required
@role_required('admin')
def api_update_user(user_id):
    data = request.json
    if not data:
        return jsonify({"error": "no data"}), 400

    db = get_db()
    user = User.get_by_id(db, user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    if 'password' in data and data['password']:
        user.update_password(db, data['password'])
    if 'role' in data and data['role'] in ('view', 'edit', 'admin'):
        User.update_role(db, user_id, data['role'])

    return jsonify({"status": "updated"})


@auth_bp.route('/api/users/<user_id>', methods=['DELETE'])
@login_required
@role_required('admin')
def api_delete_user(user_id):
    db = get_db()
    user = User.get_by_id(db, user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404
    if user.id == current_user.id:
        return jsonify({"error": "cannot delete yourself"}), 400

    User.delete(db, user_id)
    return jsonify({"status": "deleted"})


@auth_bp.route('/api/profile/password', methods=['PUT'])
@login_required
def api_change_password():
    data = request.json
    if not data or 'current_password' not in data or 'new_password' not in data:
        return jsonify({"error": "current_password and new_password required"}), 400

    db = get_db()
    user = User.get_by_id(db, current_user.id)
    if not check_password_hash(user.password_hash, data['current_password']):
        return jsonify({"error": "current password is incorrect"}), 403

    user.update_password(db, data['new_password'])
    return jsonify({"status": "updated"})
