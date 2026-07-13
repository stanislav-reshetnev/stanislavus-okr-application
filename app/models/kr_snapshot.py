import uuid


def create(db, kr_id, value, source='manual', recorded_at=None):
    snapshot_id = str(uuid.uuid4())
    if recorded_at:
        db.execute(
            'INSERT INTO kr_snapshots (id, kr_id, value, source, recorded_at) '
            'VALUES (?, ?, ?, ?, ?)',
            (snapshot_id, kr_id, value, source, recorded_at)
        )
    else:
        db.execute(
            'INSERT INTO kr_snapshots (id, kr_id, value, source, recorded_at) '
            'VALUES (?, ?, ?, ?, datetime("now"))',
            (snapshot_id, kr_id, value, source)
        )
    return snapshot_id


def get_history(db, kr_id, date_from=None, date_to=None):
    query = 'SELECT id, value, recorded_at, source FROM kr_snapshots WHERE kr_id = ?'
    params = [kr_id]
    if date_from:
        query += ' AND recorded_at >= ?'
        params.append(date_from)
    if date_to:
        query += ' AND recorded_at <= ?'
        params.append(date_to)
    query += ' ORDER BY recorded_at ASC'
    rows = db.execute(query, params).fetchall()
    return [
        {'id': r['id'], 'value': r['value'], 'recordedAt': r['recorded_at'], 'source': r['source']}
        for r in rows
    ]


def delete(db, snapshot_id):
    db.execute('DELETE FROM kr_snapshots WHERE id = ?', (snapshot_id,))
    db.commit()
