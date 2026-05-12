from flask import Blueprint, request, jsonify
from flask_login import login_required

from app.database import get_db
from app.models import team as team_model
from app.auth_utils import role_required

teams_bp = Blueprint('teams', __name__)


@teams_bp.route('/api/teams', methods=['GET'])
@login_required
def get_teams():
    db = get_db()
    return jsonify(team_model.get_all(db))


@teams_bp.route('/api/teams', methods=['POST'])
@login_required
@role_required('edit', 'admin')
def create_team():
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "name required"}), 400

    db = get_db()
    result = team_model.create(db, data['name'])
    if result is None:
        return jsonify({"error": "Team already exists"}), 409
    return jsonify(result), 201


@teams_bp.route('/api/teams/<team_id>', methods=['PUT'])
@login_required
@role_required('edit', 'admin')
def update_team(team_id):
    db = get_db()
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "name required"}), 400

    if not team_model.update(db, team_id, data['name']):
        return jsonify({"error": "Team name already exists"}), 409
    return jsonify({"status": "updated"})


@teams_bp.route('/api/teams/<team_id>', methods=['DELETE'])
@login_required
@role_required('edit', 'admin')
def delete_team(team_id):
    db = get_db()
    team_model.delete(db, team_id)
    return jsonify({"status": "deleted"})
