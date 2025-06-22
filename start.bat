@echo off
echo ========================================
echo Hotel Monitoring Utility - Start
echo ========================================

echo.
echo Starting backend...
start "Backend" cmd /k "cd apps\backend && npm run dev"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting frontend...
start "Frontend" cmd /k "cd apps\frontend && npm run dev"

echo.
echo ========================================
echo Services started!
echo ========================================
echo.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo.
pause 