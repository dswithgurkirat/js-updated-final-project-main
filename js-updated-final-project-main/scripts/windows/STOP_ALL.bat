@echo off
setlocal
cd /d "%~dp0..\.."
echo Stopping local API, worker, web, and legacy Node processes...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Resolve-Path '.').Path; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($root) -and $_.Name -eq 'node.exe' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }"
echo Stopping Docker services...
docker compose down
echo Closed project app processes and Docker services.
pause

