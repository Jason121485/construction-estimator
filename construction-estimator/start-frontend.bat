@echo off
echo Starting PlumbEst Frontend (React + Vite)...
cd /d "%~dp0frontend"

:: Install dependencies if needed
if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)

echo.
echo Frontend running at: http://localhost:5173
echo.
npm run dev
