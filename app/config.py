import os
import secrets

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class Config:
    COMPANY_NAME = os.environ.get('COMPANY_NAME', 'Company')
    APP_HOST = os.environ.get('APP_HOST', 'http://localhost:5000')
    SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(32))

    @classmethod
    def get_cors_origins(cls):
        raw = os.environ.get('CORS_ORIGINS', '')
        return [o.strip() for o in raw.split(',') if o.strip()]

    @classmethod
    def get_database_path(cls):
        return os.environ.get('OKR_DB_PATH', os.path.join(ROOT, 'data', 'okr.db'))

    @classmethod
    def init_app(cls, app):
        app.config['APP_HOST'] = cls.APP_HOST
        if not os.environ.get('SECRET_KEY'):
            key_file = os.path.join(os.path.dirname(cls.get_database_path()), '.secret_key')
            if os.path.exists(key_file):
                with open(key_file) as f:
                    app.secret_key = f.read().strip()
            else:
                key = secrets.token_hex(32)
                os.makedirs(os.path.dirname(key_file), exist_ok=True)
                with open(key_file, 'w') as f:
                    f.write(key)
                app.secret_key = key
        else:
            app.secret_key = cls.SECRET_KEY
