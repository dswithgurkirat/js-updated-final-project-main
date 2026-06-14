@echo off
setlocal
cd /d "%~dp0..\.."

echo.
echo Repairing Smart DSR npm install
echo ===============================
echo.

echo Removing incomplete dependencies...
if exist package-lock.json del package-lock.json
if exist node_modules rmdir /s /q node_modules

echo Cleaning npm cache metadata...
call npm cache verify

echo Installing clean dependencies...
call npm install --no-audit --no-fund --legacy-peer-deps
if errorlevel 1 (
  echo.
  echo Clean install failed. Check internet connection and retry.
  pause
  exit /b 1
)

echo.
echo Repair complete. Now run START_HERE.bat
pause

