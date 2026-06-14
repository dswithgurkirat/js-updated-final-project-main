@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Smart DSR Portal - Fast Simple Start

echo.
echo Smart DSR Portal - Fast Simple Start
echo ====================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not available in PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

set "LEGACY_DIR=%~dp0apps\web\public\legacy"
cd /d "%LEGACY_DIR%"

echo Building static portal files...
node build.js
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Starting lightweight local portal on http://localhost:8081 ...
echo No Docker, no Next dev server, no worker.
set DSR_NO_WATCH=1

:: Kill any previous instance on port 8081
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":8081 " ^| findstr /c:"LISTENING"') do (
  echo Stopping previous process on port 8081 (PID: %%a)
  taskkill /f /pid %%a >nul 2>nul
)
timeout /t 1 /nobreak >nul

:: Start server in a dedicated window (stays open so you can see errors)
start "DSR Simple Portal - Server" cmd /k "set DSR_NO_WATCH=1&& node server.js"
if errorlevel 1 (
  echo Failed to start server.
  pause
  exit /b 1
)

echo.
echo Opening the portal...
timeout /t 3 /nobreak >nul
start http://localhost:8081/home.html

echo.
echo ===================================
echo  Portal started successfully!
echo  Server window title: "DSR Simple Portal - Server"
echo  Close that window to stop the server.
echo ===================================
echo.
echo Demo login:
echo   admin@demo.com / password123
echo   iit@demo.com / password123
echo   sdlc@demo.com / password123
echo.
pause
