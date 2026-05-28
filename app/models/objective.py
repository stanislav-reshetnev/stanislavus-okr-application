import uuid


def get_all(db):
    rows = db.execute(
        'SELECT id, name, parent_id, team_id, manager_id, doc_link, position FROM objectives'
    ).fetchall()
    return [_row_to_camel(dict(r)) for r in rows]


def _row_to_camel(d):
    return {
        'id': d['id'],
        'name': d['name'],
        'parentId': d['parent_id'],
        'teamId': d['team_id'],
        'managerId': d['manager_id'],
        'docLink': d['doc_link'],
        'position': d['position'],
    }


def get_by_id(db, obj_id):
    row = db.execute(
        'SELECT id, name, parent_id, team_id, manager_id, doc_link, position FROM objectives WHERE id = ?',
        (obj_id,)
    ).fetchone()
    return _row_to_camel(dict(row)) if row else None


def create(db, data):
    parent_id = data.get('parentId')
    if not parent_id:
        existing = db.execute(
            'SELECT id FROM objectives WHERE parent_id IS NULL'
        ).fetchone()
        if existing:
            raise ValueError('A company-wide objective already exists. Only one root objective is allowed.')
    max_pos = db.execute(
        'SELECT COALESCE(MAX(position), -1) FROM objectives WHERE parent_id IS ?',
        (parent_id,)
    ).fetchone()[0]
    obj_id = str(uuid.uuid4())
    team_id = data.get('teamId')
    manager_id = data.get('managerId')
    doc_link = data.get('docLink', '')
    db.execute(
        'INSERT INTO objectives (id, name, parent_id, team_id, manager_id, doc_link, position) '
        'VALUES (?,?,?,?,?,?,?)',
        (obj_id, data['name'], parent_id,
         team_id, manager_id, doc_link, max_pos + 1)
    )
    db.commit()

    team = db.execute('SELECT name FROM teams WHERE id=?', (team_id,)).fetchone()
    manager = db.execute('SELECT name FROM managers WHERE id=?', (manager_id,)).fetchone()
    return {
        "id": obj_id,
        "name": data['name'],
        "parentId": parent_id,
        "teamId": team_id,
        "managerId": manager_id,
        "docLink": doc_link,
        "position": max_pos + 1,
        "teamName": team['name'] if team else None,
        "managerName": manager['name'] if manager else None,
    }


def update(db, obj_id, data):
    if 'parentId' in data and not data['parentId']:
        existing = db.execute(
            'SELECT id FROM objectives WHERE parent_id IS NULL AND id != ?',
            (obj_id,)
        ).fetchone()
        if existing:
            raise ValueError('A company-wide objective already exists. Only one root objective is allowed.')
    fields = []
    values = []
    key_map = {
        'name': 'name',
        'parentId': 'parent_id',
        'teamId': 'team_id',
        'managerId': 'manager_id',
        'docLink': 'doc_link',
        'position': 'position',
    }
    for camel_key, db_key in key_map.items():
        if camel_key in data:
            fields.append(f"{db_key}=?")
            values.append(data[camel_key])
    if not fields:
        return False
    values.append(obj_id)
    db.execute(f"UPDATE objectives SET {', '.join(fields)} WHERE id=?", values)
    db.commit()
    return True


def reorder(db, items):
    for item in items:
        db.execute('UPDATE objectives SET position = ? WHERE id = ?', (item['position'], item['id']))
    db.commit()


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
        db.execute('DELETE FROM initiatives WHERE objective_id = ?', (oid,))
    for oid in all_ids:
        db.execute('DELETE FROM objectives WHERE id = ?', (oid,))
    db.commit()
    return all_ids
