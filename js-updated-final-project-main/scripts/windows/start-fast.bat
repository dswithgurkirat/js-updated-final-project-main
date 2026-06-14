@echo off
setlocal
cd /d "%~dp0..\.."

echo.
echo Smart DSR modern stack quick start
echo =================================
echo.

if not exist node_modules\.bin\next.cmd (
  echo Dependencies are not fully installed.
  echo Running npm install now. First run can take some time.
  call npm install --no-audit --no-fund --legacy-peer-deps
  if errorlevel 1 (
    echo.
    echo npm install failed. Please rerun:
    echo npm install --no-audit --no-fund --legacy-peer-deps
    pause
    exit /b 1
  )
)

if not exist .env (
  copy .env.example .env >nul
)

echo Starting API in a new window...
start "DSR API" cmd /k "cd /d ""%~dp0..\.."" && npm run dev:api"

echo Starting web in a new window...
start "DSR Web" cmd /k "cd /d ""%~dp0..\.."" && npm run dev:web"

echo.
echo Open: http://localhost:3000
echo Note: PostgreSQL/Docker is needed only for database-backed login/API.
echo If API says database connection failed, run: docker compose up -d
echo.
pause

