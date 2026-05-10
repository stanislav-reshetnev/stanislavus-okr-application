def build_tree(db, team_filter=None, manager_filter=None):
    objs = db.execute(
        'SELECT id, name, parent_id, team_id, manager_id, doc_link FROM objectives'
    ).fetchall()
    krs = db.execute('SELECT * FROM key_results').fetchall()
    teams = {t['id']: t['name'] for t in db.execute('SELECT * FROM teams').fetchall()}
    managers = {m['id']: m['name'] for m in db.execute('SELECT * FROM managers').fetchall()}

    obj_dict = {}
    for o in objs:
        o = dict(o)
        o['children'] = []
        o['keyresults'] = []
        o['team_name'] = teams.get(o['team_id'], '')
        o['manager_name'] = managers.get(o['manager_id'], '')
        obj_dict[o['id']] = o

    for kr in krs:
        kr = dict(kr)
        obj_id = kr['objective_id']
        if obj_id in obj_dict:
            obj_dict[obj_id]['keyresults'].append(kr)

    if team_filter or manager_filter:
        return _build_filtered_tree(obj_dict, krs, team_filter, manager_filter)

    for oid, obj in obj_dict.items():
        pid = obj.get('parent_id')
        if pid and pid in obj_dict:
            obj_dict[pid]['children'].append(obj)

    return [
        obj for oid, obj in obj_dict.items()
        if not obj.get('parent_id') or obj['parent_id'] not in obj_dict
    ]


def _build_filtered_tree(obj_dict, krs, team_filter, manager_filter):
    parent_to_children = {}
    for oid, obj in obj_dict.items():
        pid = obj.get('parent_id')
        if pid:
            parent_to_children.setdefault(pid, []).append(oid)

    if team_filter:
        direct_matches = [
            oid for oid, obj in obj_dict.items()
            if obj['team_id'] == team_filter
        ]
    else:
        direct_matches = [
            oid for oid, obj in obj_dict.items()
            if obj['manager_id'] == manager_filter
        ]

    allowed_ids = set()

    def add_ancestors(oid):
        if oid in allowed_ids:
            return
        allowed_ids.add(oid)
        parent = obj_dict[oid].get('parent_id')
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
        obj['keyresults'] = []

    for kr in krs:
        kr = dict(kr)
        obj_id = kr['objective_id']
        if obj_id in filtered:
            filtered[obj_id]['keyresults'].append(kr)

    for oid, obj in filtered.items():
        pid = obj.get('parent_id')
        if pid and pid in filtered:
            filtered[pid]['children'].append(obj)

    return [
        obj for oid, obj in filtered.items()
        if not obj.get('parent_id') or obj['parent_id'] not in filtered
    ]
