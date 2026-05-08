@echo off
title Bait Storage Management System Runner

echo [1/3] Starting Backend (FastAPI)...
start "Bait Storage Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && uvicorn main:app --reload --port 8000"

echo [2/3] Starting Frontend (Vite)...
start "Bait Storage Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Opening Browser...
timeout /t 5
start http://localhost:5173

echo.
echo All systems are starting up! 
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
