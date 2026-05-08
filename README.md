# Technova Adaptive Assessment System

An intelligent adaptive assessment platform that evaluates student ability using **Item Response Theory (IRT)** and the **Rasch Measurement Model**.

Instead of relying on raw scores, the system dynamically adjusts question difficulty based on user responses to estimate true ability (**θ**), improving accuracy and efficiency.

---

## Overview

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Flask (Python)
- **Database:** SQLite
- **Core Engine:** Adaptive testing using IRT (3PL model)

---

## Features

### Student
- User registration & login
- Adaptive test with dynamic difficulty
- Real-time ability estimation (θ) with SEM tracking
- Progress tracking during tests
- Final results:
  - Ability score
  - Standardized score (0–100)
  - Accuracy
- Test history view

---

### Admin / Examiner
- Secure admin dashboard
- System analytics:
  - Total students
  - Completed tests
  - Average scores
- Student-level insights:
  - Response breakdown
  - Correct/incorrect tracking
  - Timestamped answers
- Export results to CSV (auto-clears DB)
- Access Rasch metrics (θ, SEM)

---

### Adaptive Testing Engine
- 3-Parameter Logistic (3PL) model
- Maximum Information Question Selection
- Dynamic θ updates after each response
- Stopping conditions:
  - Max questions reached
  - OR SEM ≤ 0.6

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- React Router
- MUI + Radix UI
- TailwindCSS
- Recharts

### Backend
- Python 3.10+
- Flask
- Flask-SQLAlchemy
- Flask-Login
- Flask-CORS
- SQLite
- Gunicorn

---

## 📁 Project Structure

```
technova-main/
├── backend/
├── src/
├── public/
├── package.json
├── requirements.txt
└── README.md
```

---

## System Requirements

- Python ≥ 3.10  
- Node.js ≥ 18  
- npm  
- Git  

---

## Installation & Setup

### Clone Repository
```
git clone <repo-url>
cd technova-main
```

### Backend Setup
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend Setup
```
npm install
npm run dev
```

---

## Configuration

### Backend Environment Variables

| Variable | Default |
|----------|--------|
|FLASK_ENV| production|
| SECRET_KEY | 2026 |
| DATABASE_URL | sqlite:///exam.db |
| CORS_ORIGINS | localhost:5173 |

---

## Running the App

- Backend: http://127.0.0.1:5000  
- Frontend: http://localhost:5173  

---

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Test
- POST /api/test/start
- GET /api/test/question
- POST /api/test/answer
- POST /api/test/finish
- GET /api/test_result

### Admin
- GET /api/admin/stats
- GET /api/admin/students
- GET /api/admin/student/<id>
- GET /api/admin/export

---

## Default Admin Login

Email: admin@technova.com  
Password: admin123  

---

## Troubleshooting

- Activate virtual environment if modules missing
- Ensure backend is running for API calls
- Check CORS settings if blocked
- Kill ports if already in use
- Ensure database is not locked

---

## Production Tips

- Use PostgreSQL instead of SQLite
- Set strong SECRET_KEY
- Configure proper CORS
- Use Gunicorn with reverse proxy

---

## Support

Open an issue in the repository for bugs or feature requests.
