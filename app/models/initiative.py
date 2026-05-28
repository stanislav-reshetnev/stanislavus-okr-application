import uuid


def _row_to_camel(d):
    return {
        'id': d['id'],
        'objectiveId': d['objective_id'],
        'name': d['name'],
        'what': d['what'],
        'impact': d['impact'],
        'docLink': d['doc_link'],
        'position': d['position'],
        'status': d['status'],
    }


def create(db, objective_id, data):
    obj_exists = db.execute(
        'SELECT 1 FROM objectives WHERE id=?', (objective_id,)
    ).fetchone()
    if not obj_exists:
        return None

    max_pos = db.execute(
        'SELECT COALESCE(MAX(position), -1) FROM initiatives WHERE objective_id=?',
        (objective_id,)
    ).fetchone()[0]

    init_id = str(uuid.uuid4())
    name = data['name']
    what = data.get('what', '')
    impact = data.get('impact', '')
    doc_link = data.get('docLink', '')
    status = data.get('status', 'backlog')

    db.execute(
        'INSERT INTO initiatives (id, objective_id, name, what, impact, doc_link, position, status) VALUES (?,?,?,?,?,?,?,?)',
        (init_id, objective_id, name, what, impact, doc_link, max_pos + 1, status)
    )
    db.commit()
    return {
        'id': init_id,
        'objectiveId': objective_id,
        'name': name,
        'what': what,
        'impact': impact,
        'docLink': doc_link,
        'position': max_pos + 1,
        'status': status,
    }


def update(db, init_id, data):
    fields = []
    values = []
    key_map = {
        'name': 'name',
        'what': 'what',
        'impact': 'impact',
        'docLink': 'doc_link',
        'position': 'position',
        'status': 'status',
    }
    for camel_key, db_key in key_map.items():
        if camel_key in data:
            fields.append(f"{db_key}=?")
            values.append(data[camel_key])

    if not fields:
        return False
    values.append(init_id)
    db.execute(f"UPDATE initiatives SET {', '.join(fields)} WHERE id=?", values)
    db.commit()
    return True


def reorder(db, items):
    for item in items:
        db.execute('UPDATE initiatives SET position = ? WHERE id = ?', (item['position'], item['id']))
    db.commit()


def delete(db, init_id):
    db.execute('DELETE FROM initiatives WHERE id = ?', (init_id,))
    db.commit()
