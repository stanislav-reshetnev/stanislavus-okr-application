import secrets
import uuid
from datetime import datetime

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash


class User(UserMixin):
    def __init__(self, row):
        self.id = row['id']
        self.email = row['email']
        self.password_hash = row['password_hash']
        self.role = row['role']
        self.registered_at = row['registered_at']
        self.last_login_at = row['last_login_at']
        self.api_token = row['api_token']
        self.api_token_generated_at = row['api_token_generated_at']

    @staticmethod
    def get_by_id(db, user_id):
        row = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        return User(row) if row else None

    @staticmethod
    def get_by_email(db, email):
        row = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        return User(row) if row else None

    @staticmethod
    def get_by_api_token(db, token):
        row = db.execute('SELECT * FROM users WHERE api_token = ?', (token,)).fetchone()
        return User(row) if row else None

    @staticmethod
    def create(db, email, password, role='view'):
        user_id = str(uuid.uuid4())
        password_hash = generate_password_hash(password)
        now = datetime.utcnow().isoformat()
        db.execute(
            'INSERT INTO users (id, email, password_hash, role, registered_at) VALUES (?, ?, ?, ?, ?)',
            (user_id, email, password_hash, role, now)
        )
        db.commit()
        user = User.get_by_id(db, user_id)
        user.generate_api_token(db)
        return user

    def generate_api_token(self, db):
        self.api_token = secrets.token_urlsafe(32)
        self.api_token_generated_at = datetime.utcnow().isoformat()
        db.execute(
            'UPDATE users SET api_token = ?, api_token_generated_at = ? WHERE id = ?',
            (self.api_token, self.api_token_generated_at, self.id)
        )
        db.commit()

    def update_password(self, db, new_password):
        self.password_hash = generate_password_hash(new_password)
        db.execute('UPDATE users SET password_hash = ? WHERE id = ?', (self.password_hash, self.id))
        db.commit()

    def update_last_login(self, db):
        self.last_login_at = datetime.utcnow().isoformat()
        db.execute('UPDATE users SET last_login_at = ? WHERE id = ?', (self.last_login_at, self.id))
        db.commit()

    @staticmethod
    def count(db):
        row = db.execute('SELECT COUNT(*) as cnt FROM users').fetchone()
        return row['cnt']

    @staticmethod
    def get_all(db):
        rows = db.execute('SELECT * FROM users ORDER BY registered_at ASC').fetchall()
        return [User(r) for r in rows]

    @staticmethod
    def update_role(db, user_id, role):
        db.execute('UPDATE users SET role = ? WHERE id = ?', (role, user_id))
        db.commit()

    @staticmethod
    def delete(db, user_id):
        db.execute('DELETE FROM users WHERE id = ?', (user_id,))
        db.commit()

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'registeredAt': self.registered_at,
            'lastLoginAt': self.last_login_at,
            'apiToken': self.api_token,
            'apiTokenGeneratedAt': self.api_token_generated_at,
        }
