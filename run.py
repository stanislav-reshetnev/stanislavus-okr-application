import os

from app import create_app
from app.config import Config
from app.database import init_db

app = create_app()

db_path = Config.get_database_path()
print(f"[OKR] Database path: {db_path} (OKR_DB_PATH={os.environ.get('OKR_DB_PATH', 'not set')})", flush=True)
os.makedirs(os.path.dirname(db_path), exist_ok=True)
init_db(app)

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode, use_reloader=False)
