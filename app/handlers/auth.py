from flask import request
from flask_login import login_required, current_user
from werkzeug.security import check_password_hash

from app.database import get_db
from app.models.user import User
from app.auth_utils import role_required


@login_required
@role_required('admin')
def getUsers():
    db = get_db()
    users = User.get_all(db)
    return {"users": [u.to_dict() for u in users]}


@login_required
@role_required('admin')
def createUser(body):
    email = body['email'].strip()
    password = body['password']

    db = get_db()
    existing = User.get_by_email(db, email)
    if existing:
        return {'error': 'User with this email already exists'}, 409

    role = body.get('role', 'view')
    if role not in ('view', 'edit', 'admin'):
        role = 'view'

    user = User.create(db, email, password, role=role)
    return user.to_dict(), 201


@login_required
@role_required('admin')
def updateUser(userId, body):
    db = get_db()
    user = User.get_by_id(db, userId)
    if not user:
        return {'error': 'user not found'}, 404

    if 'password' in body and body['password']:
        user.update_password(db, body['password'])
    if 'role' in body and body['role'] in ('view', 'edit', 'admin'):
        User.update_role(db, userId, body['role'])
    if body.get('regenerateToken'):
        user.generate_api_token(db)

    return user.to_dict()


@login_required
@role_required('admin')
def deleteUser(userId):
    db = get_db()
    user = User.get_by_id(db, userId)
    if not user:
        return {'error': 'user not found'}, 404
    if user.id == current_user.id:
        return {'error': 'cannot delete yourself'}, 400

    User.delete(db, userId)
    return {'status': 'deleted'}


@login_required
def changePassword(body):
    current_password = body['currentPassword']
    new_password = body['newPassword']

    db = get_db()
    user = User.get_by_id(db, current_user.id)
    if not check_password_hash(user.password_hash, current_password):
        return {'error': 'current password is incorrect'}, 403

    user.update_password(db, new_password)
    return {'status': 'updated'}
