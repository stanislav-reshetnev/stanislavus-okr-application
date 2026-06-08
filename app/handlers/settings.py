from flask_login import login_required

from app.database import get_db
from app.models import settings as settings_model
from app.auth_utils import role_required


@login_required
@role_required('admin')
def getSettings():
    db = get_db()
    return settings_model.get_all(db)


@login_required
@role_required('admin')
def updateSettings(body):
    db = get_db()
    for key, value in body.items():
        settings_model.set_setting(db, key, value)
    return {'status': 'updated'}
