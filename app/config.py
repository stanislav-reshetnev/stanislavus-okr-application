import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class Config:
    DATABASE = os.environ.get('OKR_DB_PATH', os.path.join(ROOT, 'data', 'okr.db'))
    COMPANY_NAME = os.environ.get('COMPANY_NAME', 'Company')
