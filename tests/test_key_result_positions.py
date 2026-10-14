import sqlite3

from app.models import key_result


def _db():
    db = sqlite3.connect(':memory:')
    db.row_factory = sqlite3.Row
    db.executescript('''
        PRAGMA foreign_keys = ON;
        CREATE TABLE objectives (id TEXT PRIMARY KEY);
        CREATE TABLE key_results (
            id TEXT PRIMARY KEY,
            objective_id TEXT NOT NULL,
            name TEXT NOT NULL,
            position INTEGER NOT NULL,
            FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
        );
        CREATE TABLE kr_snapshots (
            id TEXT PRIMARY KEY,
            kr_id TEXT NOT NULL,
            value REAL NOT NULL,
            recorded_at TEXT NOT NULL,
            source TEXT DEFAULT 'manual',
            FOREIGN KEY (kr_id) REFERENCES key_results(id) ON DELETE CASCADE
        );
    ''')
    return db


def test_delete_rebuilds_kr_positions_without_changing_remaining_ids():
    db = _db()
    db.execute("INSERT INTO objectives (id) VALUES ('objective-1')")
    ids = [f'kr-{i}' for i in range(4)]
    for position, kr_id in enumerate(ids):
        db.execute(
            'INSERT INTO key_results (id, objective_id, name, position) VALUES (?, ?, ?, ?)',
            (kr_id, 'objective-1', kr_id, position),
        )
        db.execute(
            'INSERT INTO kr_snapshots (id, kr_id, value, recorded_at) VALUES (?, ?, ?, ?)',
            (f'snapshot-{kr_id}', kr_id, position, '2026-01-01'),
        )
    db.commit()

    assert key_result.delete(db, 'kr-1') is True

    remaining = db.execute(
        'SELECT id, position FROM key_results WHERE objective_id = ? ORDER BY position',
        ('objective-1',),
    ).fetchall()
    assert [(row['id'], row['position']) for row in remaining] == [
        ('kr-0', 0),
        ('kr-2', 1),
        ('kr-3', 2),
    ]
    assert db.execute(
        'SELECT COUNT(*) FROM kr_snapshots WHERE kr_id = ?', ('kr-1',)
    ).fetchone()[0] == 0
    assert db.execute('SELECT COUNT(*) FROM kr_snapshots').fetchone()[0] == 3


def test_delete_repairs_existing_position_gaps():
    db = _db()
    db.execute("INSERT INTO objectives (id) VALUES ('objective-1')")
    for kr_id, position in (('kr-a', 0), ('kr-b', 4), ('kr-c', 9)):
        db.execute(
            'INSERT INTO key_results (id, objective_id, name, position) VALUES (?, ?, ?, ?)',
            (kr_id, 'objective-1', kr_id, position),
        )
    db.commit()

    assert key_result.delete(db, 'kr-a') is True
    rows = db.execute(
        'SELECT id, position FROM key_results ORDER BY position, id'
    ).fetchall()
    assert [(row['id'], row['position']) for row in rows] == [
        ('kr-b', 0),
        ('kr-c', 1),
    ]


def test_delete_missing_kr_is_noop():
    db = _db()
    db.execute("INSERT INTO objectives (id) VALUES ('objective-1')")
    db.commit()

    assert key_result.delete(db, 'missing') is False
    assert db.execute('SELECT COUNT(*) FROM key_results').fetchone()[0] == 0
