from flask import Blueprint, request, jsonify

from app.config import Config
from app.database import get_db
from app.models import manager as manager_model

managers_bp = Blueprint('managers', __name__)


@managers_bp.route('/api/managers', methods=['GET'])
def get_managers():
    db = get_db()
    managers = manager_model.get_all(db)
    print(f"[DEBUG] Managers: {len(managers)} rows, DB file: {Config.DATABASE}", flush=True)
    return jsonify(managers)


@managers_bp.route('/api/managers', methods=['POST'])
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
def update_manager(manager_id):
    db = get_db()
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "name required"}), 400

    if not manager_model.update(db, manager_id, data['name']):
        return jsonify({"error": "Manager name already exists"}), 409
    return jsonify({"status": "updated"})


@managers_bp.route('/api/managers/<manager_id>', methods=['DELETE'])
def delete_manager(manager_id):
    db = get_db()
    manager_model.delete(db, manager_id)
    return jsonify({"status": "deleted"})
