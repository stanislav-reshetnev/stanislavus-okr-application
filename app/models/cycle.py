import uuid


def _row_to_camel(d):
    return {
        'id': d['id'],
        'name': d['name'],
        'status': d['status'],
        'startDate': d['start_date'],
        'endDate': d['end_date'],
        'cycleLength': d['cycle_length'],
        'createdAt': d['created_at'],
    }


def create(db, data):
    cycle_id = str(uuid.uuid4())
    name = data.get('name', '')
    start = data.get('startDate')
    end = data.get('endDate')
    length = data.get('cycleLength', 'quarter')
    status = data.get('status', 'draft')
    db.execute(
        'INSERT INTO cycles (id, name, status, start_date, end_date, cycle_length) VALUES (?, ?, ?, ?, ?, ?)',
        (cycle_id, name, status, start, end, length)
    )
    db.commit()
    row = db.execute('SELECT * FROM cycles WHERE id = ?', (cycle_id,)).fetchone()
    return _row_to_camel(dict(row))


def get_all(db):
    rows = db.execute('SELECT * FROM cycles ORDER BY start_date DESC').fetchall()
    return [_row_to_camel(dict(r)) for r in rows]


def get_by_id(db, cycle_id):
    row = db.execute('SELECT * FROM cycles WHERE id = ?', (cycle_id,)).fetchone()
    return _row_to_camel(dict(row)) if row else None


def get_current(db):
    row = db.execute("SELECT * FROM cycles WHERE status = 'in_progress' ORDER BY start_date DESC LIMIT 1").fetchone()
    return _row_to_camel(dict(row)) if row else None


def get_by_status(db, status):
    rows = db.execute('SELECT * FROM cycles WHERE status = ? ORDER BY start_date DESC', (status,)).fetchall()
    return [_row_to_camel(dict(r)) for r in rows]


def update_status(db, cycle_id, status):
    db.execute('UPDATE cycles SET status = ? WHERE id = ?', (status, cycle_id))
    db.commit()
    return get_by_id(db, cycle_id)


def update(db, cycle_id, data):
    fields = []
    values = []
    for col, key in [('name', 'name'), ('start_date', 'startDate'), ('end_date', 'endDate'), ('cycle_length', 'cycleLength')]:
        if key in data:
            fields.append(f'{col} = ?')
            values.append(data[key])
    if not fields:
        return get_by_id(db, cycle_id)
    values.append(cycle_id)
    db.execute(f'UPDATE cycles SET {", ".join(fields)} WHERE id = ?', values)
    db.commit()
    return get_by_id(db, cycle_id)
