from flask_login import login_required

from app.database import get_db
from app.models import objective as objective_model
from app.services.tree import build_tree
from app.auth_utils import role_required


@login_required
def getTree(teamId=None, managerId=None):
    db = get_db()
    roots = build_tree(db, teamId, managerId)
    return {"tree": roots}


@login_required
def getObjectivesFlat():
    db = get_db()
    return {"objectives": objective_model.get_all(db)}


@login_required
@role_required('edit', 'admin')
def createObjective(body):
    if 'name' not in body:
        return {'error': 'name required'}, 400
    db = get_db()
    try:
        obj = objective_model.create(db, body)
    except ValueError as e:
        return {'error': str(e)}, 409
    return obj, 201


@login_required
@role_required('edit', 'admin')
def reorderObjectives(body):
    db = get_db()
    items = body.get('items', [])
    objective_model.reorder(db, items)
    return {'status': 'ok'}


@login_required
@role_required('edit', 'admin')
def updateObjective(objectiveId, body):
    db = get_db()
    try:
        if not objective_model.update(db, objectiveId, body):
            return {'error': 'no fields to update'}, 400
    except ValueError as e:
        return {'error': str(e)}, 409
    return {'status': 'updated'}


@login_required
@role_required('edit', 'admin')
def deleteObjective(objectiveId):
    db = get_db()
    removed_ids = objective_model.delete_cascade(db, objectiveId)
    return {'status': 'deleted', 'removed_ids': removed_ids}
