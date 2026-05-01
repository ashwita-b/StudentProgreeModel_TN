@echo off
echo 🚀 Starting Technova Education System - Backend
echo ================================================
echo.

cd backend

echo 📦 Checking Python dependencies...
pip install -r requirements.txt

echo.
echo 🔥 Starting Flask server...
echo Backend will run on: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py
