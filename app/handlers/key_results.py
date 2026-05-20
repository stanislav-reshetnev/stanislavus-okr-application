from flask_login import login_required

from app.database import get_db
from app.models import key_result as kr_model
from app.auth_utils import role_required


@login_required
@role_required('edit', 'admin')
def createKeyResult(objectiveId, body):
    if 'name' not in body:
        return {'error': 'name required'}, 400
    db = get_db()
    kr = kr_model.create(db, objectiveId, body)
    if kr is None:
        return {'error': 'objective not found'}, 404
    return kr, 201


@login_required
@role_required('edit', 'admin')
def reorderKeyResults(body):
    db = get_db()
    items = body.get('items', [])
    kr_model.reorder(db, items)
    return {'status': 'ok'}


@login_required
@role_required('edit', 'admin')
def updateKeyResult(keyResultId, body):
    db = get_db()
    kr_model.update(db, keyResultId, body)
    return {'status': 'updated'}


@login_required
@role_required('edit', 'admin')
def deleteKeyResult(keyResultId):
    db = get_db()
    kr_model.delete(db, keyResultId)
    return {'status': 'deleted'}
