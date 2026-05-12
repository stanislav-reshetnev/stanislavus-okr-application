from flask import Blueprint, request, jsonify
from flask_login import login_required

from app.database import get_db
from app.models import manager as manager_model
from app.auth_utils import role_required

managers_bp = Blueprint('managers', __name__)


@managers_bp.route('/api/managers', methods=['GET'])
@login_required
def get_managers():
    db = get_db()
    managers = manager_model.get_all(db)
    return jsonify(managers)


@managers_bp.route('/api/managers', methods=['POST'])
@login_required
@role_required('edit', 'admin')
def create_manager():
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "name required"}), 400

    db = get_db()
    result = manager_model.create(db, data['name'])
    if result is None:
        return jsonify({"error": "Manager already exists"}), 409
    return jsonify(result), 201


@managers_bp.route('/api/managers/<manager_id>', methods=['PUT'])
@login_required
@role_required('edit', 'admin')
def update_manager(manager_id):
    db = get_db()
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "name required"}), 400

    if not manager_model.update(db, manager_id, data['name']):
        return jsonify({"error": "Manager name already exists"}), 409
    return jsonify({"status": "updated"})


@managers_bp.route('/api/managers/<manager_id>', methods=['DELETE'])
@login_required
@role_required('edit', 'admin')
def delete_manager(manager_id):
    db = get_db()
    manager_model.delete(db, manager_id)
    return jsonify({"status": "deleted"})
