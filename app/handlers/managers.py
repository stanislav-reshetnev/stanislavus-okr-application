from flask_login import login_required

from app.database import get_db
from app.models import manager as manager_model
from app.auth_utils import role_required


@login_required
def getManagers():
    db = get_db()
    return {"managers": manager_model.get_all(db)}


@login_required
@role_required('edit', 'admin')
def createManager(body):
    name = body['name']
    db = get_db()
    result = manager_model.create(db, name)
    if result is None:
        return {'error': 'Manager already exists'}, 409
    return result, 201


@login_required
@role_required('edit', 'admin')
def updateManager(managerId, body):
    db = get_db()
    if not manager_model.update(db, managerId, body['name']):
        return {'error': 'Manager name already exists'}, 409
    return {'status': 'updated'}


@login_required
@role_required('edit', 'admin')
def deleteManager(managerId):
    db = get_db()
    manager_model.delete(db, managerId)
    return {'status': 'deleted'}
