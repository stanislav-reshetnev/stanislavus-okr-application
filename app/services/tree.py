def _row_to_camel_obj(d):
    return {
        'id': d['id'],
        'name': d['name'],
        'parentId': d['parent_id'],
        'teamId': d['team_id'],
        'managerId': d['manager_id'],
        'docLink': d['doc_link'],
        'position': d['position'],
        'children': [],
        'keyResults': [],
        'initiatives': [],
        'teamName': d.get('team_name', ''),
        'managerName': d.get('manager_name', ''),
    }


def _row_to_camel_kr(d):
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


def _row_to_camel_initiative(d):
    return {
        'id': d['id'],
        'objectiveId': d['objective_id'],
        'name': d['name'],
        'what': d['what'],
        'impact': d['impact'],
        'docLink': d['doc_link'],
        'position': d['position'],
        'status': d.get('status', 'backlog'),
    }


def _sort_children(tree):
    for obj in tree:
        obj['children'] = sorted(obj['children'], key=lambda x: x.get('position', 0))
        obj['keyResults'] = sorted(obj['keyResults'], key=lambda x: x.get('position', 0))
        obj['initiatives'] = sorted(obj['initiatives'], key=lambda x: x.get('position', 0))
        _sort_children(obj['children'])
    return tree


def build_tree(db, team_filter=None, manager_filter=None):
    objs = db.execute(
        'SELECT id, name, parent_id, team_id, manager_id, doc_link, position FROM objectives'
    ).fetchall()
    krs = db.execute('SELECT * FROM key_results').fetchall()
    initiatives = db.execute('SELECT * FROM initiatives ORDER BY objective_id, position').fetchall()
    teams = {t['id']: t['name'] for t in db.execute('SELECT * FROM teams').fetchall()}
    managers = {m['id']: m['name'] for m in db.execute('SELECT * FROM managers').fetchall()}

    obj_dict = {}
    for o in objs:
        o_dict = _row_to_camel_obj(dict(o))
        o_dict['teamName'] = teams.get(o['team_id'], '')
        o_dict['managerName'] = managers.get(o['manager_id'], '')
        obj_dict[o_dict['id']] = o_dict

    for kr in krs:
        kr_dict = _row_to_camel_kr(dict(kr))
        obj_id = kr_dict['objectiveId']
        if obj_id in obj_dict:
            obj_dict[obj_id]['keyResults'].append(kr_dict)

    for inv in initiatives:
        inv_dict = _row_to_camel_initiative(dict(inv))
        obj_id = inv_dict['objectiveId']
        if obj_id in obj_dict:
            obj_dict[obj_id]['initiatives'].append(inv_dict)

    if team_filter or manager_filter:
        return _sort_children(_build_filtered_tree(obj_dict, team_filter, manager_filter))

    for oid, obj in obj_dict.items():
        pid = obj.get('parentId')
        if pid and pid in obj_dict:
            obj_dict[pid]['children'].append(obj)

    roots = [
        obj for oid, obj in obj_dict.items()
        if not obj.get('parentId') or obj['parentId'] not in obj_dict
    ]
    return _sort_children(roots)


def _build_filtered_tree(obj_dict, team_filter, manager_filter):
    parent_to_children = {}
    for oid, obj in obj_dict.items():
        pid = obj.get('parentId')
        if pid:
            parent_to_children.setdefault(pid, []).append(oid)

    if team_filter:
        direct_matches = [
            oid for oid, obj in obj_dict.items()
            if obj['teamId'] == team_filter
        ]
    else:
        direct_matches = [
            oid for oid, obj in obj_dict.items()
            if obj['managerId'] == manager_filter
        ]

    allowed_ids = set()

    def add_ancestors(oid):
        if oid in allowed_ids:
            return
        allowed_ids.add(oid)
        parent = obj_dict[oid].get('parentId')
        if parent and parent in obj_dict:
            add_ancestors(parent)

    def add_descendants(oid):
        if oid in allowed_ids:
            return
        allowed_ids.add(oid)
        for child_id in parent_to_children.get(oid, []):
            add_descendants(child_id)

    for match_id in direct_matches:
        add_ancestors(match_id)
        add_descendants(match_id)

    filtered = {oid: obj_dict[oid] for oid in allowed_ids}
    for oid, obj in filtered.items():
        obj['children'] = []

    for oid, obj in filtered.items():
        pid = obj.get('parentId')
        if pid and pid in filtered:
            filtered[pid]['children'].append(obj)

    return [
        obj for oid, obj in filtered.items()
        if not obj.get('parentId') or obj['parentId'] not in filtered
    ]
