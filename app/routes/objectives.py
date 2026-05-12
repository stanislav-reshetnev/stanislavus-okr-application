from flask import Blueprint, request, jsonify
from flask_login import login_required

from app.database import get_db
from app.models import objective as objective_model
from app.services.tree import build_tree
from app.auth_utils import role_required

objectives_bp = Blueprint('objectives', __name__)


@objectives_bp.route('/api/tree', methods=['GET'])
@login_required
def get_tree():
    db = get_db()
    team_filter = request.args.get('team_id')
    manager_filter = request.args.get('manager_id')
    roots = build_tree(db, team_filter, manager_filter)
    return jsonify(roots)


@objectives_bp.route('/api/objectives/flat', methods=['GET'])
@login_required
def get_objectives_flat():
    db = get_db()
    return jsonify(objective_model.get_all(db))


@objectives_bp.route('/api/objectives', methods=['POST'])
@login_required
@role_required('edit', 'admin')
def create_objective():
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "name required"}), 400

    db = get_db()
    obj = objective_model.create(db, data)
    return jsonify(obj), 201


@objectives_bp.route('/api/objectives/<obj_id>', methods=['PUT'])
@login_required
@role_required('edit', 'admin')
def update_objective(obj_id):
    db = get_db()
    data = request.json
    if not objective_model.update(db, obj_id, data):
        return jsonify({"error": "no fields to update"}), 400
    return jsonify({"status": "updated"})


@objectives_bp.route('/api/objectives/<obj_id>', methods=['DELETE'])
@login_required
@role_required('edit', 'admin')
def delete_objective(obj_id):
    db = get_db()
    removed_ids = objective_model.delete_cascade(db, obj_id)
    return jsonify({"status": "deleted", "removed_ids": removed_ids})
