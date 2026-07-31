import uuid

from app.models import kr_snapshot as snapshot_model


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
        'confidence': d.get('confidence', 'medium'),
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
    confidence = data.get('confidence', 'medium')

    db.execute(
        'INSERT INTO key_results '
        '(id, objective_id, name, target_value, current_value, initial_value, unit, source, doc_link, description, position, confidence, last_updated) '
        'VALUES (?,?,?,?,?,?,?,?,?,?,?,?, datetime("now"))',
        (kr_id, objective_id, data['name'], target_value,
         current_value, initial_value, unit, source,
         doc_link, description, max_pos + 1, confidence)
    )
    snapshot_model.create(db, kr_id, current_value, source)
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
        'confidence': confidence,
    }


def _values_equal(a, b):
    """Сравнение значений с допуском для float (NaN-safe)."""
    if a is None or b is None:
        return a == b
    try:
        return abs(float(a) - float(b)) < 1e-9
    except (ValueError, TypeError):
        return a == b


def update(db, kr_id, data):
    current = db.execute(
        'SELECT current_value, target_value, initial_value FROM key_results WHERE id=?',
        (kr_id,)
    ).fetchone()
    if not current:
        return False

    fields = []
    values = []
    key_map = {
        'name': 'name',
        'unit': 'unit',
        'docLink': 'doc_link',
        'description': 'description',
        'position': 'position',
        'confidence': 'confidence',
    }
    for camel_key, db_key in key_map.items():
        if camel_key in data:
            fields.append(f"{db_key}=?")
            values.append(data[camel_key])

    if 'initialValue' in data and not _values_equal(data['initialValue'], current['initial_value']):
        fields.append('initial_value=?')
        values.append(data['initialValue'])

    if 'targetValue' in data and not _values_equal(data['targetValue'], current['target_value']):
        fields.append('target_value=?')
        values.append(data['targetValue'])

    metric_refresh = False
    if 'currentValue' in data and not _values_equal(data['currentValue'], current['current_value']):
        metric_refresh = True
        fields.append('current_value=?')
        values.append(data['currentValue'])

    if not fields:
        return False
    values.append(kr_id)
    db.execute(f"UPDATE key_results SET {', '.join(fields)} WHERE id=?", values)

    if metric_refresh:
        snapshot_model.create(
            db, kr_id, data['currentValue'],
            data.get('source', 'manual'),
            data.get('recordedAt')
        )
        if 'source' in data:
            db.execute(
                'UPDATE key_results SET last_updated = datetime("now"), source = ? WHERE id=?',
                (data['source'], kr_id)
            )
        else:
            db.execute(
                'UPDATE key_results SET last_updated = datetime("now") WHERE id=?',
                (kr_id,)
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
