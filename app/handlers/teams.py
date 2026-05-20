from flask_login import login_required

from app.database import get_db
from app.models import team as team_model
from app.auth_utils import role_required


@login_required
def getTeams():
    db = get_db()
    return {"teams": team_model.get_all(db)}


@login_required
@role_required('edit', 'admin')
def createTeam(body):
    name = body['name']
    db = get_db()
    result = team_model.create(db, name)
    if result is None:
        return {'error': 'Team already exists'}, 409
    return result, 201


@login_required
@role_required('edit', 'admin')
def updateTeam(teamId, body):
    db = get_db()
    if not team_model.update(db, teamId, body['name']):
        return {'error': 'Team name already exists'}, 409
    return {'status': 'updated'}


@login_required
@role_required('edit', 'admin')
def deleteTeam(teamId):
    db = get_db()
    team_model.delete(db, teamId)
    return {'status': 'deleted'}
