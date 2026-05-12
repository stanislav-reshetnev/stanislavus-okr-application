from flask import Blueprint, request, jsonify
from flask_login import login_required

from app.database import get_db
from app.models import key_result as kr_model
from app.auth_utils import role_required

key_results_bp = Blueprint('key_results', __name__)


@key_results_bp.route('/api/objectives/<obj_id>/keyresults', methods=['POST'])
@login_required
@role_required('edit', 'admin')
def add_keyresult(obj_id):
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "name required"}), 400

    db = get_db()
    kr = kr_model.create(db, obj_id, data)
    if kr is None:
        return jsonify({"error": "objective not found"}), 404
    return jsonify(kr), 201


@key_results_bp.route('/api/keyresults/<kr_id>', methods=['PUT'])
@login_required
@role_required('edit', 'admin')
def update_keyresult(kr_id):
    data = request.json
    db = get_db()
    kr_model.update(db, kr_id, data)
    return jsonify({"status": "updated"})


@key_results_bp.route('/api/keyresults/<kr_id>', methods=['DELETE'])
@login_required
@role_required('edit', 'admin')
def delete_keyresult(kr_id):
    db = get_db()
    kr_model.delete(db, kr_id)
    return jsonify({"status": "deleted"})
