from flask_login import login_required

from app.database import get_db
from app.models import key_result as kr_model
from app.models import kr_snapshot as snapshot_model
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


@login_required
def getKeyResultHistory(keyResultId):
    db = get_db()
    return snapshot_model.get_history(db, keyResultId)


@login_required
@role_required('edit', 'admin')
def addKeyResultSnapshot(keyResultId, body):
    if 'value' not in body or 'recordedAt' not in body:
        return {'error': 'value and recordedAt are required'}, 400
    db = get_db()
    kr = db.execute('SELECT 1 FROM key_results WHERE id = ?', (keyResultId,)).fetchone()
    if not kr:
        return {'error': 'key result not found'}, 404
    snapshot_model.create(
        db, keyResultId, body['value'],
        body.get('source', 'manual'),
        body['recordedAt']
    )
    db.commit()
    return {'status': 'created'}, 201


@login_required
@role_required('edit', 'admin')
def deleteKeyResultSnapshot(keyResultId, snapshotId):
    db = get_db()
    snapshot_model.delete(db, snapshotId)
    return {'status': 'deleted'}
