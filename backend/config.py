#config.py
import os
from datetime import timedelta

# Schools list - add/remove here as needed
ALLOWED_SCHOOLS = [
    "Anant English School, Siddhipur",
    "LRI School, Kalanki",
    "MBBS, Hetauda",
]

# Module definitions - label shown in UI and CSV file to use
MODULES = {
    "module1": {
        "label": "Module 1",
        "description": "Month 1 Test",
        "csv_file": "module1_mcq.csv",
        "unlocked": True,
    },
    "module2": {
        "label": "Module 2",
        "description": "Month 2 Test",
        "csv_file": "module2_mcq.csv",
        "unlocked": False,
    },
    "module3": {
        "label": "Module 3",
        "description": "Month 3 Test",
        "csv_file": "module3_mcq.csv",
        "unlocked": False,
    },
    "module4": {
        "label": "Module 4",
        "description": "Month 4 Test",
        "csv_file": "module4_mcq.csv",
        "unlocked": False,
    },
}

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or '2026'

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///exam.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    PERMANENT_SESSION_LIFETIME = timedelta(hours=2)

    MAX_ITEMS = 18
    SEM_THRESHOLD = 0.6

    # Correct CORS list
    _cors_env = os.environ.get('CORS_ORIGINS', '')
    CORS_ORIGINS = [origin.strip() for origin in _cors_env.split(',') if origin.strip()] if _cors_env else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://student-progree-model-tn.vercel.app" 
    ]
