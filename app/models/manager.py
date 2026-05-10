import sqlite3
import uuid


def get_all(db):
    rows = db.execute('SELECT * FROM managers').fetchall()
    return [dict(r) for r in rows]


def create(db, name):
    manager_id = str(uuid.uuid4())
    try:
        db.execute('INSERT INTO managers (id, name) VALUES (?, ?)', (manager_id, name))
        db.commit()
        return {"id": manager_id, "name": name}
    except sqlite3.IntegrityError:
        return None


def update(db, manager_id, name):
    try:
        db.execute('UPDATE managers SET name = ? WHERE id = ?', (name, manager_id))
        db.commit()
        return True
    except sqlite3.IntegrityError:
        return False


def delete(db, manager_id):
    db.execute('DELETE FROM managers WHERE id = ?', (manager_id,))
    db.commit()
