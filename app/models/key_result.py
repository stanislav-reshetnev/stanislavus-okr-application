import uuid


def get_all(db):
    rows = db.execute('SELECT * FROM key_results').fetchall()
    return [dict(r) for r in rows]


def create(db, objective_id, data):
    obj_exists = db.execute(
        'SELECT 1 FROM objectives WHERE id=?', (objective_id,)
    ).fetchone()
    if not obj_exists:
        return None

    kr = {
        "id": str(uuid.uuid4()),
        "objective_id": objective_id,
        "name": data['name'],
        "target_value": data.get('target_value', 0),
        "current_value": data.get('current_value', 0),
        "initial_value": data.get('initial_value', 0),
        "unit": data.get('unit', ''),
        "source": data.get('source', 'manual')
    }
    db.execute(
        'INSERT INTO key_results '
        '(id, objective_id, name, target_value, current_value, initial_value, unit, source, last_updated) '
        'VALUES (?,?,?,?,?,?,?,?, datetime("now"))',
        (kr['id'], objective_id, kr['name'], kr['target_value'],
         kr['current_value'], kr['initial_value'], kr['unit'], kr['source'])
    )
    db.commit()
    kr['last_updated'] = db.execute(
        'SELECT last_updated FROM key_results WHERE id=?', (kr['id'],)
    ).fetchone()['last_updated']
    return kr


def update(db, kr_id, data):
    fields = []
    values = []
    for k in ['name', 'target_value', 'current_value', 'initial_value', 'unit']:
        if k in data:
            fields.append(f"{k}=?")
            values.append(data[k])
    fields.append('last_updated = datetime("now")')
    source = data.get('source', 'manual')
    fields.append('source = ?')
    values.append(source)

    if not fields:
        return False
    values.append(kr_id)
    db.execute(f"UPDATE key_results SET {', '.join(fields)} WHERE id=?", values)
    db.commit()
    return True


def delete(db, kr_id):
    db.execute('DELETE FROM key_results WHERE id = ?', (kr_id,))
    db.commit()
