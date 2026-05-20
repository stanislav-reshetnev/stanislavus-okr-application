import os

env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip())

from app import create_app
from app.config import Config
from app.database import init_db

connexion_app = create_app()
flask_app = connexion_app.app

db_path = Config.get_database_path()
print(f"[OKR] Database path: {db_path} (OKR_DB_PATH={os.environ.get('OKR_DB_PATH', 'not set')})", flush=True)
os.makedirs(os.path.dirname(db_path), exist_ok=True)
init_db(flask_app)

# Export as 'app' for ASGI server (uvicorn/gunicorn): run:app
app = connexion_app

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    connexion_app.run(host='0.0.0.0', port=5000, debug=debug_mode, use_reloader=False)
