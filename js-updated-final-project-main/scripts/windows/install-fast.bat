@echo off
setlocal
cd /d "%~dp0..\.."

echo Cleaning interrupted npm temp state...
if exist package-lock.json del package-lock.json

echo Installing dependencies with faster settings...
call npm install --no-audit --no-fund --legacy-peer-deps

echo.
echo Done. Now run:
echo start-fast.bat
pause

