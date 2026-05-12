import sqlite3

from flask import g

from app.config import Config


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(Config.get_database_path())
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
    return db


def close_db(exception=None):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def init_db(app):
    with app.app_context():
        db = get_db()
        db.executescript('''
            CREATE TABLE IF NOT EXISTS teams (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS managers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS objectives (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id TEXT,
                team_id TEXT,
                manager_id TEXT,
                FOREIGN KEY (parent_id) REFERENCES objectives(id) ON DELETE SET NULL,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
                FOREIGN KEY (manager_id) REFERENCES managers(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS key_results (
                id TEXT PRIMARY KEY,
                objective_id TEXT NOT NULL,
                name TEXT NOT NULL,
                target_value REAL DEFAULT 0,
                current_value REAL DEFAULT 0,
                unit TEXT DEFAULT '',
                FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'view',
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP
            );
        ''')
        try:
            db.execute('ALTER TABLE key_results ADD COLUMN last_updated TIMESTAMP DEFAULT NULL')
        except sqlite3.OperationalError:
            pass
        try:
            db.execute('ALTER TABLE key_results ADD COLUMN source TEXT DEFAULT "manual"')
        except sqlite3.OperationalError:
            pass
        try:
            db.execute('ALTER TABLE objectives ADD COLUMN doc_link TEXT DEFAULT ""')
        except sqlite3.OperationalError:
            pass
        try:
            db.execute('ALTER TABLE key_results ADD COLUMN initial_value REAL DEFAULT 0')
        except sqlite3.OperationalError:
            pass
        db.commit()
