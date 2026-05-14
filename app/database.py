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
                last_login_at TIMESTAMP,
                api_token TEXT DEFAULT NULL,
                api_token_generated_at TIMESTAMP DEFAULT NULL
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
            db.execute('ALTER TABLE users ADD COLUMN api_token TEXT DEFAULT NULL')
        except sqlite3.OperationalError:
            pass
        try:
            db.execute('ALTER TABLE users ADD COLUMN api_token_generated_at TIMESTAMP DEFAULT NULL')
        except sqlite3.OperationalError:
            pass
        try:
            db.execute('ALTER TABLE key_results ADD COLUMN initial_value REAL DEFAULT 0')
        except sqlite3.OperationalError:
            pass
        try:
            db.execute('ALTER TABLE key_results ADD COLUMN doc_link TEXT DEFAULT ""')
        except sqlite3.OperationalError:
            pass
        try:
            db.execute('ALTER TABLE objectives ADD COLUMN position INTEGER DEFAULT 0')
        except sqlite3.OperationalError:
            pass
        try:
            db.execute('ALTER TABLE key_results ADD COLUMN position INTEGER DEFAULT 0')
        except sqlite3.OperationalError:
            pass
        try:
            db.execute('ALTER TABLE key_results ADD COLUMN description TEXT DEFAULT ""')
        except sqlite3.OperationalError:
            pass

        db.execute('''
            CREATE TABLE IF NOT EXISTS _meta_columns (
                table_name TEXT,
                column_name TEXT,
                description TEXT,
                PRIMARY KEY (table_name, column_name)
            )
        ''')
        descriptions = {
            'objectives': {
                'id': 'Primary key, UUID',
                'name': 'Objective name',
                'parent_id': 'Parent objective ID for hierarchy',
                'team_id': 'Owning team ID',
                'manager_id': 'Responsible manager ID',
                'doc_link': 'Link to documentation',
                'position': 'Sort order among siblings (0-based)',
            },
            'key_results': {
                'id': 'Primary key, UUID',
                'objective_id': 'Parent objective ID',
                'name': 'Key result name',
                'target_value': 'Target value (goal)',
                'current_value': 'Current measured value. Changing this refreshes last_updated and source.',
                'initial_value': 'Starting value at creation',
                'unit': 'Unit of measurement (%, pcs, $, etc.)',
                'source': 'Source of the last metric update: "manual" or "api". Auto-updated when current_value changes.',
                'doc_link': 'Link to metric source or documentation',
                'description': 'Internal notes about metric calculation logic',
                'position': 'Sort order among siblings (0-based)',
                'last_updated': 'Timestamp of the last current_value change',
            },
            'users': {
                'id': 'Primary key, UUID',
                'email': 'User email / login',
                'password_hash': 'bcrypt password hash',
                'role': 'Access level: view, edit, admin',
                'registered_at': 'Account creation timestamp',
                'last_login_at': 'Last successful login timestamp',
                'api_token': 'Bearer token for API access',
                'api_token_generated_at': 'Token generation/regeneration timestamp',
            },
            'teams': {
                'id': 'Primary key, UUID',
                'name': 'Team name',
            },
            'managers': {
                'id': 'Primary key, UUID',
                'name': 'Manager name',
            },
        }
        for table_name, cols in descriptions.items():
            for col_name, desc in cols.items():
                db.execute(
                    'INSERT OR REPLACE INTO _meta_columns (table_name, column_name, description) VALUES (?, ?, ?)',
                    (table_name, col_name, desc)
                )

        db.commit()
