import uuid


def get_all(db):
    rows = db.execute('SELECT * FROM key_results').fetchall()
    return [_row_to_camel(dict(r)) for r in rows]


def _row_to_camel(d):
    return {
        'id': d['id'],
        'objectiveId': d['objective_id'],
        'name': d['name'],
        'targetValue': d['target_value'],
        'currentValue': d['current_value'],
        'initialValue': d['initial_value'],
        'unit': d['unit'],
        'source': d['source'],
        'docLink': d['doc_link'],
        'description': d['description'],
        'position': d['position'],
        'lastUpdated': d.get('last_updated'),
    }


def create(db, objective_id, data):
    obj_exists = db.execute(
        'SELECT 1 FROM objectives WHERE id=?', (objective_id,)
    ).fetchone()
    if not obj_exists:
        return None

    max_pos = db.execute(
        'SELECT COALESCE(MAX(position), -1) FROM key_results WHERE objective_id=?',
        (objective_id,)
    ).fetchone()[0]

    kr_id = str(uuid.uuid4())
    target_value = data.get('targetValue', 0)
    current_value = data.get('currentValue', 0)
    initial_value = data.get('initialValue', 0)
    unit = data.get('unit', '')
    source = data.get('source', 'manual')
    doc_link = data.get('docLink', '')
    description = data.get('description', '')

    db.execute(
        'INSERT INTO key_results '
        '(id, objective_id, name, target_value, current_value, initial_value, unit, source, doc_link, description, position, last_updated) '
        'VALUES (?,?,?,?,?,?,?,?,?,?,?, datetime("now"))',
        (kr_id, objective_id, data['name'], target_value,
         current_value, initial_value, unit, source,
         doc_link, description, max_pos + 1)
    )
    db.commit()
    last_updated = db.execute(
        'SELECT last_updated FROM key_results WHERE id=?', (kr_id,)
    ).fetchone()['last_updated']
    return {
        'id': kr_id,
        'objectiveId': objective_id,
        'name': data['name'],
        'targetValue': target_value,
        'currentValue': current_value,
        'initialValue': initial_value,
        'unit': unit,
        'source': source,
        'docLink': doc_link,
        'description': description,
        'position': max_pos + 1,
        'lastUpdated': last_updated,
    }


def update(db, kr_id, data):
    fields = []
    values = []
    key_map = {
        'name': 'name',
        'targetValue': 'target_value',
        'initialValue': 'initial_value',
        'unit': 'unit',
        'docLink': 'doc_link',
        'description': 'description',
        'position': 'position',
    }
    for camel_key, db_key in key_map.items():
        if camel_key in data:
            fields.append(f"{db_key}=?")
            values.append(data[camel_key])

    metric_refresh = False
    if 'currentValue' in data:
        old = db.execute(
            'SELECT current_value FROM key_results WHERE id=?', (kr_id,)
        ).fetchone()
        metric_refresh = old and old['current_value'] != data['currentValue']
        fields.append('current_value=?')
        values.append(data['currentValue'])

    if not fields:
        return False
    values.append(kr_id)
    db.execute(f"UPDATE key_results SET {', '.join(fields)} WHERE id=?", values)

    if metric_refresh:
        db.execute(
            'UPDATE key_results SET last_updated = datetime("now"), source = ? WHERE id=?',
            (data.get('source', 'manual'), kr_id)
        )
    db.commit()
    return True


def reorder(db, items):
    for item in items:
        db.execute('UPDATE key_results SET position = ? WHERE id = ?', (item['position'], item['id']))
    db.commit()


def delete(db, kr_id):
    db.execute('DELETE FROM key_results WHERE id = ?', (kr_id,))
    db.commit()
