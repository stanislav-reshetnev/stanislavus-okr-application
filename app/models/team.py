import sqlite3
import uuid


def get_all(db):
    rows = db.execute('SELECT * FROM teams').fetchall()
    return [dict(r) for r in rows]


def create(db, name):
    team_id = str(uuid.uuid4())
    try:
        db.execute('INSERT INTO teams (id, name) VALUES (?, ?)', (team_id, name))
        db.commit()
        return {"id": team_id, "name": name}
    except sqlite3.IntegrityError:
        return None


def update(db, team_id, name):
    try:
        db.execute('UPDATE teams SET name = ? WHERE id = ?', (name, team_id))
        db.commit()
        return True
    except sqlite3.IntegrityError:
        return False


def delete(db, team_id):
    db.execute('DELETE FROM teams WHERE id = ?', (team_id,))
    db.commit()
