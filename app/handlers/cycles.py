from flask_login import login_required

from app.database import get_db
from app.models import cycle as cycle_model
from app.auth_utils import role_required


@login_required
@role_required('admin')
def listCycles():
    db = get_db()
    return {'cycles': cycle_model.get_all(db)}


def _check_in_progress_conflict(db, body, exclude_id=None):
    if body.get('status') == 'in_progress':
        existing = cycle_model.get_by_status(db, 'in_progress')
        for c in existing:
            if c['id'] != exclude_id:
                return f'Cycle "{c["name"]}" is already in progress. Complete or revert it first.'
    return None


@login_required
@role_required('admin')
def createCycle(body):
    if not body.get('startDate') or not body.get('endDate'):
        return {'error': 'startDate and endDate are required'}, 400
    db = get_db()
    conflict = _check_in_progress_conflict(db, body)
    if conflict:
        return {'error': conflict}, 409
    result = cycle_model.create(db, body)
    return result, 201


@login_required
@role_required('admin')
def updateCycleStatus(cycleId, body):
    db = get_db()
    status = body.get('status')
    if status not in ('draft', 'in_progress', 'completed'):
        return {'error': 'invalid status'}, 400
    conflict = _check_in_progress_conflict(db, {'status': status}, exclude_id=cycleId)
    if conflict:
        return {'error': conflict}, 409
    result = cycle_model.update_status(db, cycleId, status)
    if not result:
        return {'error': 'not found'}, 404
    return result


@login_required
@role_required('admin')
def updateCycle(cycleId, body):
    db = get_db()
    existing = cycle_model.get_by_id(db, cycleId)
    if not existing:
        return {'error': 'not found'}, 404
    if body.get('startDate') and body.get('endDate') and body['startDate'] > body['endDate']:
        return {'error': 'startDate must be before endDate'}, 400
    result = cycle_model.update(db, cycleId, body)
    return result
