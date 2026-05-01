import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'technova-education-secret-key-2026'

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///exam.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    PERMANENT_SESSION_LIFETIME = timedelta(hours=2)

    MAX_ITEMS = 18
    SEM_THRESHOLD = 0.6
    CSV_FILE = 'rn_db_mcq.csv'

    # ✅ Proper CORS list - supports environment variable with comma-separated origins
    _cors_env = os.environ.get('CORS_ORIGINS', '')
    CORS_ORIGINS = [origin.strip() for origin in _cors_env.split(',') if origin.strip()] if _cors_env else [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]