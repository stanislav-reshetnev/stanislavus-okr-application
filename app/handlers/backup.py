import json
import sqlite3
from datetime import datetime, timezone

from flask_login import login_required

from app.auth_utils import role_required
from app.database import get_db

BACKUP_VERSION = 1

# Display order for the UI; FK-safe order for deletes/inserts
TABLE_ORDER = [
    'users',
    'teams',
    'managers',
    'cycles',
    'objectives',
    'key_results',
    'kr_snapshots',
    'initiatives',
    'settings',
]

# Children first: deleting/inserting in this order never violates FKs
TABLE_FK_ORDER = [
    'kr_snapshots',
    'initiatives',
    'key_results',
    'objectives',
    'cycles',
    'teams',
    'managers',
    'users',
    'settings',
]

TABLE_COLUMNS = {
    'users': ['id', 'email', 'password_hash', 'role', 'registered_at',
              'last_login_at', 'api_token', 'api_token_generated_at'],
    'teams': ['id', 'name'],
    'managers': ['id', 'name'],
    'cycles': ['id', 'name', 'status', 'start_date', 'end_date',
               'cycle_length', 'created_at'],
    'objectives': ['id', 'name', 'parent_id', 'team_id', 'manager_id',
                   'doc_link', 'position', 'cycle_id'],
    'key_results': ['id', 'objective_id', 'name', 'target_value',
                    'current_value', 'initial_value', 'unit', 'doc_link',
                    'description', 'position', 'confidence', 'source',
                    'last_updated'],
    'kr_snapshots': ['id', 'kr_id', 'value', 'recorded_at', 'source'],
    'initiatives': ['id', 'objective_id', 'name', 'what', 'impact',
                    'doc_link', 'position', 'status'],
    'settings': ['key', 'value'],
}


def _fetch_rows(db, table):
    rows = db.execute(f'SELECT * FROM {table}').fetchall()
    return [dict(r) for r in rows]


@login_required
@role_required('admin')
def getBackupStats():
    db = get_db()
    tables = []
    for name in TABLE_ORDER:
        rows = _fetch_rows(db, name)
        tables.append({
            'name': name,
            'count': len(rows),
            'sizeBytes': len(json.dumps(rows, default=str).encode('utf-8')),
        })
    return {'tables': tables}


@login_required
@role_required('admin')
def exportData(body):
    requested = body.get('tables') or []
    if not isinstance(requested, list) or not requested:
        return {'error': 'tables must be a non-empty list'}, 400
    unknown = [t for t in requested if t not in TABLE_COLUMNS]
    if unknown:
        return {'error': f'unknown tables: {", ".join(unknown)}'}, 400

    db = get_db()
    data = {table: _fetch_rows(db, table) for table in requested}
    return {
        'version': BACKUP_VERSION,
        'exportedAt': datetime.now(timezone.utc).isoformat(),
        'data': data,
    }


def _topo_sort_objectives(rows):
    """Order objectives so parents are inserted before children."""
    remaining = list(rows)
    inserted = set()
    ordered = []
    while remaining:
        progressed = False
        for row in list(remaining):
            pid = row.get('parent_id')
            if not pid or pid in inserted:
                ordered.append(row)
                inserted.add(row['id'])
                remaining.remove(row)
                progressed = True
        if not progressed:
            raise ValueError('objectives parent_id contains a cycle')
    return ordered


@login_required
@role_required('admin')
def importData(body):
    if body.get('version') != BACKUP_VERSION:
        return {'error': f'unsupported backup version: {body.get("version")}'}, 400
    data = body.get('data')
    if not isinstance(data, dict) or not data:
        return {'error': 'data must be a non-empty object'}, 400
    unknown = [t for t in data if t not in TABLE_COLUMNS]
    if unknown:
        return {'error': f'unknown tables: {", ".join(unknown)}'}, 400
    for table, rows in data.items():
        if not isinstance(rows, list):
            return {'error': f'table {table} must be a list'}, 400
        cols = TABLE_COLUMNS[table]
        id_col = cols[0]
        for i, row in enumerate(rows):
            if not isinstance(row, dict) or row.get(id_col) in (None, ''):
                return {'error': f'{table}[{i}]: missing required field {id_col}'}, 400
            extra = [c for c in row if c not in cols]
            if extra:
                return {'error': f'{table}[{i}]: unknown columns {", ".join(extra)}'}, 400

    try:
        if 'objectives' in data:
            data = dict(data, objectives=_topo_sort_objectives(data['objectives']))
    except ValueError as e:
        return {'error': str(e)}, 400

    db = get_db()
    # Children first for deletes (TABLE_FK_ORDER), parents first for inserts (reversed)
    tables = [t for t in TABLE_FK_ORDER if t in data]
    try:
        for table in tables:
            db.execute(f'DELETE FROM {table}')
        for table in reversed(tables):
            cols = TABLE_COLUMNS[table]
            placeholders = ', '.join('?' for _ in cols)
            quoted = ', '.join(f'"{c}"' for c in cols)
            for row in data[table]:
                values = [row.get(c) for c in cols]
                db.execute(
                    f'INSERT INTO {table} ({quoted}) VALUES ({placeholders})',
                    values,
                )
        db.commit()
    except sqlite3.IntegrityError as e:
        db.rollback()
        return {'error': f'import failed: {e}'}, 400
    except sqlite3.Error as e:
        db.rollback()
        return {'error': f'import failed: {e}'}, 400

    imported = {t: len(data[t]) for t in tables}
    return {'status': 'imported', 'tables': imported}
