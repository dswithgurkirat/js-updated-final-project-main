@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Smart DSR Portal - Full Stack

echo.
echo ===================================
echo  Smart DSR Portal - Full Stack
echo ===================================
echo.

:: ============================================
::  1. Check Prerequisites
:: ============================================

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  pause
  exit /b 1
)

netstat -an 2>nul | findstr /c:":5432 " | findstr /c:"LISTENING" >nul
if errorlevel 1 (
  echo PostgreSQL is not running on port 5432.
  echo Run "docker-compose up -d" or start Docker services manually.
  pause
  exit /b 1
)

netstat -an 2>nul | findstr /c:":6379 " | findstr /c:"LISTENING" >nul
if errorlevel 1 (
  echo Redis is not running on port 6379.
  pause
  exit /b 1
)

echo [OK] Node.js and Docker services are available.
echo.

:: ============================================
::  2. Create .env if missing
:: ============================================

if not exist ".env" (
  echo Creating .env with credentials for local Docker containers...
  > .env echo DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/dsr_db?schema=public"
  >> .env echo REDIS_URL="redis://127.0.0.1:6379"
  >> .env echo JWT_SECRET="local-dev-jwt-secret-2024"
  >> .env echo JWT_EXPIRES_IN="24h"
  >> .env echo PORT=8080
  >> .env echo NEXT_PUBLIC_API_URL="http://localhost:8080/api"
  >> .env echo S3_ENDPOINT="http://localhost:9000"
  >> .env echo S3_ACCESS_KEY="minioadmin"
  >> .env echo S3_SECRET_KEY="minioadmin"
  >> .env echo S3_BUCKET="dsr-files"
  >> .env echo S3_REGION="us-east-1"
  >> .env echo LOCAL_FILE_STORAGE=false
  >> .env echo AWS_REGION="us-east-1"
  >> .env echo AWS_S3_BUCKET="dsr-files"
  >> .env echo AWS_S3_ENDPOINT="http://localhost:9000"
  >> .env echo AWS_S3_FORCE_PATH_STYLE=true
  >> .env echo AWS_ACCESS_KEY_ID="minioadmin"
  >> .env echo AWS_SECRET_ACCESS_KEY="minioadmin"
  >> .env echo QUEUE_REDIS_URL="redis://127.0.0.1:6379"
  >> .env echo NEXT_PUBLIC_API_BASE_URL="http://localhost:8080"
  echo [OK] .env created.
) else (
  echo [OK] .env already exists.
)

echo.

:: ============================================
::  3. Install dependencies
:: ============================================

if not exist "node_modules" (
  echo Installing npm dependencies ^(this may take a few minutes^)...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
  echo [OK] Dependencies installed.
) else (
  echo [OK] node_modules already exists, skipping npm install.
)

echo.

:: ============================================
::  4. Prisma: generate client, push schema, seed
:: ============================================

:: Write .env files for each app while we're in the root
> "%~dp0apps\api\.env" echo DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/dsr_db?schema=public
>> "%~dp0apps\api\.env" echo REDIS_URL=redis://127.0.0.1:6379
>> "%~dp0apps\api\.env" echo JWT_SECRET=local-dev-jwt-secret-2024
>> "%~dp0apps\api\.env" echo JWT_EXPIRES_IN=24h
>> "%~dp0apps\api\.env" echo PORT=8080
>> "%~dp0apps\api\.env" echo S3_ENDPOINT=http://localhost:9000
>> "%~dp0apps\api\.env" echo S3_ACCESS_KEY=minioadmin
>> "%~dp0apps\api\.env" echo S3_SECRET_KEY=minioadmin
>> "%~dp0apps\api\.env" echo S3_BUCKET=dsr-files
>> "%~dp0apps\api\.env" echo S3_REGION=us-east-1
>> "%~dp0apps\api\.env" echo LOCAL_FILE_STORAGE=false
>> "%~dp0apps\api\.env" echo AWS_REGION=us-east-1
>> "%~dp0apps\api\.env" echo AWS_S3_BUCKET=dsr-files
>> "%~dp0apps\api\.env" echo AWS_S3_ENDPOINT=http://localhost:9000
>> "%~dp0apps\api\.env" echo AWS_S3_FORCE_PATH_STYLE=true
>> "%~dp0apps\api\.env" echo AWS_ACCESS_KEY_ID=minioadmin
>> "%~dp0apps\api\.env" echo AWS_SECRET_ACCESS_KEY=minioadmin
>> "%~dp0apps\api\.env" echo QUEUE_REDIS_URL=redis://127.0.0.1:6379
> "%~dp0apps\web\.env.local" echo NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

cd /d "%~dp0apps\api"

:: Set env vars for Prisma CLI in current process
set DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/dsr_db?schema=public
set REDIS_URL=redis://127.0.0.1:6379
set JWT_SECRET=local-dev-jwt-secret-2024
set JWT_EXPIRES_IN=24h
set PORT=8080

if not exist "node_modules\.prisma\client" (
  echo Generating Prisma client...
  call npx prisma generate
  if errorlevel 1 (
    echo Prisma generate failed.
    cd /d "%~dp0"
    pause
    exit /b 1
  )
  echo [OK] Prisma client generated.
) else (
  echo [OK] Prisma client already generated.
)

echo.

echo Pushing database schema...
call npx prisma db push --accept-data-loss
if errorlevel 1 (
  cd /d "%~dp0"
  echo Database push failed.
  pause
  exit /b 1
)
echo [OK] Database schema pushed.

echo.

echo Seeding database...
call npx tsx prisma/seed.ts
if errorlevel 1 (
  echo Seed may already be applied ^(OK^).
) else (
  echo [OK] Database seeded.
)

cd /d "%~dp0"

echo.

:: ============================================
::  5. Kill any existing processes on ports
:: ============================================

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":8080 " ^| findstr /c:"LISTENING"') do (
  echo Stopping previous process on port 8080 ^(PID: %%a^)
  taskkill /f /pid %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":3000 " ^| findstr /c:"LISTENING"') do (
  echo Stopping previous process on port 3000 ^(PID: %%a^)
  taskkill /f /pid %%a >nul 2>nul
)
timeout /t 2 /nobreak >nul
echo [OK] Ports 8080 and 3000 are free.

echo.

:: ============================================
::  6. Start API backend (Express, port 8080)
:: ============================================

echo Starting API backend on http://localhost:8080 ...
start "DSR API Backend" cmd /k "cd /d "%~dp0apps\api" && echo. && echo [DSR API] Starting... && npx tsx watch src/server.ts"

timeout /t 5 /nobreak >nul

:: ============================================
::  7. Start frontend (Next.js, port 3000)
:: ============================================

echo Starting Next.js frontend on http://localhost:3000 ...
start "DSR Next.js Frontend" cmd /k "cd /d "%~dp0apps\web" && echo. && echo [DSR Web] Starting... && npx next dev -p 3000"

timeout /t 8 /nobreak >nul

:: ============================================
::  8. Open browser
:: ============================================

start http://localhost:3000

echo.
echo =======================================
echo  Full Stack Started!
echo =======================================
echo  API:      http://localhost:8080
echo  Frontend: http://localhost:3000
echo  Health:   http://localhost:8080/health
echo.
echo  Close the server windows to stop.
echo =======================================
echo.
pause
