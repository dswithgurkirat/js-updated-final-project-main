@echo off
setlocal
cd /d "%~dp0..\.."

echo.
echo Smart DSR Portal - One Click Start
echo ==================================
echo.

if not exist .env (
  echo Creating .env from .env.example...
  copy .env.example .env >nul
)

copy .env apps\api\.env >nul
copy .env apps\web\.env.local >nul

if not exist node_modules\.bin\next.cmd (
  echo Installing dependencies. First run can take time...
  call npm install --no-audit --no-fund --legacy-peer-deps
  if errorlevel 1 (
    echo.
    echo Install failed. Try running install-fast.bat manually.
    pause
    exit /b 1
  )
)

if not exist node_modules\effect\dist\cjs\Arbitrary.js (
  echo Repairing incomplete npm install...
  call npm install --no-audit --no-fund --legacy-peer-deps
  if errorlevel 1 (
    echo.
    echo Dependency repair failed. Run REPAIR_INSTALL.bat, then START_HERE.bat again.
    pause
    exit /b 1
  )
)

node -e "require('esbuild').transformSync('let x: number = 1', { loader: 'ts' })" >nul 2>nul
if errorlevel 1 (
  echo Repairing esbuild native binary...
  call npm rebuild esbuild
  if errorlevel 1 (
    echo.
    echo esbuild repair failed. Run REPAIR_INSTALL.bat, then START_HERE.bat again.
    pause
    exit /b 1
  )
  node -e "require('esbuild').transformSync('let x: number = 1', { loader: 'ts' })" >nul 2>nul
  if errorlevel 1 (
    echo.
    echo esbuild still cannot run. Run REPAIR_INSTALL.bat, then START_HERE.bat again.
    pause
    exit /b 1
  )
)

echo Starting database, Redis, and MinIO...
docker compose up -d postgres redis minio
if errorlevel 1 (
  echo.
  echo Docker services did not start. Start Docker Desktop, then run START_HERE.bat again.
  pause
  exit /b 1
)

echo Waiting for PostgreSQL to become ready...
set "PG_READY="
for /l %%i in (1,1,30) do (
  docker compose exec -T postgres pg_isready -U dsr -d dsr >nul 2>nul
  if not errorlevel 1 (
    set "PG_READY=1"
    goto postgres_ready
  )
  timeout /t 2 /nobreak >nul
)

:postgres_ready
if not defined PG_READY (
  echo.
  echo PostgreSQL did not become ready on port 5440.
  echo Run scripts\windows\STOP_ALL.bat, make sure Docker Desktop is running, then run START_HERE.bat again.
  pause
  exit /b 1
)

echo Stopping old local app processes before Prisma generate...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Resolve-Path '.').Path; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($root) -and $_.Name -eq 'node.exe' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }"

echo Generating Prisma client...
call npm run prisma:generate
if errorlevel 1 (
  echo Prisma generate failed. Run REPAIR_INSTALL.bat, then START_HERE.bat again.
  pause
  exit /b 1
)

echo Migrating database...
call npm run prisma:migrate
if errorlevel 1 (
  echo Database migration failed. Check Docker Desktop and DATABASE_URL in .env.
  pause
  exit /b 1
)

echo Seeding demo users...
call npm run seed
if errorlevel 1 (
  echo Database seed failed. Check Prisma migration output above.
  pause
  exit /b 1
)

echo Building latest legacy portal UI...
pushd apps\web\public\legacy
node build.js
if errorlevel 1 (
  popd
  echo Legacy portal build failed.
  pause
  exit /b 1
)
popd

echo Starting API...
netstat -ano | findstr ":8080" >nul
if not errorlevel 1 (
  echo API already running on port 8080.
) else (
  start "DSR API" cmd /k "cd /d ""%~dp0..\.."" && npm run dev:api"
)

echo Starting workers...
start "DSR Worker" cmd /k "cd /d ""%~dp0..\.."" && npm run dev:worker"

echo Starting frontend...
netstat -ano | findstr ":3000" >nul
if not errorlevel 1 (
  echo Frontend already running on port 3000.
) else (
  start "DSR Web" cmd /k "cd /d ""%~dp0..\.."" && npm run dev:web"
)

echo.
echo Opening browser...
start http://localhost:3000
echo.
echo Demo login:
echo admin@demo.com / password123
echo iit@demo.com / password123
echo sdlc@demo.com / password123
echo.
pause

