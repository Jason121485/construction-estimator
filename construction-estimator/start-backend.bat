@echo off
echo Starting PlumbEst Backend (FastAPI)...
cd /d "%~dp0backend"

:: Create virtual environment if not exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate and install
call venv\Scripts\activate
pip install -r requirements.txt -q

echo.
echo Backend running at: http://localhost:8000
echo API docs at:        http://localhost:8000/docs
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
