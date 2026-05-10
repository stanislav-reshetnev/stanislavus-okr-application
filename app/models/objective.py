import uuid


def get_all(db):
    rows = db.execute(
        'SELECT id, name, parent_id, team_id, manager_id, doc_link FROM objectives'
    ).fetchall()
    return [dict(r) for r in rows]


def get_by_id(db, obj_id):
    row = db.execute(
        'SELECT id, name, parent_id, team_id, manager_id, doc_link FROM objectives WHERE id = ?',
        (obj_id,)
    ).fetchone()
    return dict(row) if row else None


def create(db, data):
    obj = {
        "id": str(uuid.uuid4()),
        "name": data['name'],
        "parent_id": data.get('parent_id'),
        "team_id": data.get('team_id'),
        "manager_id": data.get('manager_id'),
        "doc_link": data.get('doc_link', '')
    }
    db.execute(
        'INSERT INTO objectives (id, name, parent_id, team_id, manager_id, doc_link) '
        'VALUES (?,?,?,?,?,?)',
        (obj['id'], obj['name'], obj['parent_id'],
         obj['team_id'], obj['manager_id'], obj['doc_link'])
    )
    db.commit()

    team = db.execute('SELECT name FROM teams WHERE id=?', (obj['team_id'],)).fetchone()
    manager = db.execute('SELECT name FROM managers WHERE id=?', (obj['manager_id'],)).fetchone()
    obj['team_name'] = team['name'] if team else None
    obj['manager_name'] = manager['name'] if manager else None
    return obj


def update(db, obj_id, data):
    fields = []
    values = []
    for k in ['name', 'parent_id', 'team_id', 'manager_id', 'doc_link']:
        if k in data:
            fields.append(f"{k}=?")
            values.append(data[k])
    if not fields:
        return False
    values.append(obj_id)
    db.execute(f"UPDATE objectives SET {', '.join(fields)} WHERE id=?", values)
    db.commit()
    return True


def delete_cascade(db, obj_id):
    def get_all_children_ids(oid):
        children = db.execute(
            'SELECT id FROM objectives WHERE parent_id = ?', (oid,)
        ).fetchall()
        ids = [oid]
        for child in children:
            ids.extend(get_all_children_ids(child['id']))
        return ids

    all_ids = get_all_children_ids(obj_id)
    for oid in all_ids:
        db.execute('DELETE FROM key_results WHERE objective_id = ?', (oid,))
    for oid in all_ids:
        db.execute('DELETE FROM objectives WHERE id = ?', (oid,))
    db.commit()
    return all_ids
