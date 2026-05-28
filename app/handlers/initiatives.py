from flask_login import login_required

from app.database import get_db
from app.models import initiative as initiative_model
from app.auth_utils import role_required


@login_required
@role_required('edit', 'admin')
def createInitiative(objectiveId, body):
    db = get_db()
    result = initiative_model.create(db, objectiveId, body)
    if result is None:
        return {'error': 'Objective not found'}, 404
    return result, 201


@login_required
@role_required('edit', 'admin')
def updateInitiative(initiativeId, body):
    db = get_db()
    initiative_model.update(db, initiativeId, body)
    return {'status': 'updated'}


@login_required
@role_required('edit', 'admin')
def deleteInitiative(initiativeId):
    db = get_db()
    initiative_model.delete(db, initiativeId)
    return {'status': 'deleted'}


@login_required
@role_required('edit', 'admin')
def reorderInitiatives(body):
    db = get_db()
    initiative_model.reorder(db, body['items'])
    return {'status': 'reordered'}
