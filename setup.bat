@echo off
echo ========================================
echo Hotel Monitoring Utility - Setup
echo ========================================

echo.
echo Installing root dependencies...
call npm install

echo.
echo Installing backend dependencies...
cd apps\backend
call npm install

echo.
echo Setting up database...
call npx prisma migrate dev --name init
call npx prisma generate

echo.
echo Installing frontend dependencies...
cd ..\..\apps\frontend
call npm install

echo.
echo Installing scraper dependencies...
cd ..\..\packages\scraper
call npm install

echo.
echo Installing Playwright browsers...
call npx playwright install chromium

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo To start the application:
echo   npm run dev
echo.
echo Backend will be available at: http://localhost:4000
echo Frontend will be available at: http://localhost:5173
echo.
pause 