@echo off
setlocal
cd /d "%~dp0..\.."
if not exist .env copy .env.example .env >nul
copy .env apps\api\.env >nul
copy .env apps\web\.env.local >nul
echo Env synced to apps\api\.env and apps\web\.env.local
pause

