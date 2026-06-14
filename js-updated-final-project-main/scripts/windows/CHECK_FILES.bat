@echo off
setlocal
cd /d "%~dp0..\.."
echo Checking required project files...
echo.

set missing=0
for %%F in (
  "package.json"
  ".env.example"
  "docker-compose.yml"
  "START_HERE.bat"
  "STOP_ALL.bat"
  "apps\web\package.json"
  "apps\web\app\page.tsx"
  "apps\web\app\globals.css"
  "apps\web\public\legacy\index.html"
  "apps\api\package.json"
  "apps\api\src\server.ts"
  "apps\api\src\worker.ts"
  "apps\api\src\routes\auth.ts"
  "apps\api\src\routes\projects.ts"
  "apps\api\src\routes\reports.ts"
  "apps\api\src\routes\pdf.ts"
  "apps\api\src\routes\users.ts"
  "apps\api\src\routes\files.ts"
  "apps\api\prisma\schema.prisma"
  "apps\api\prisma\seed.ts"
) do (
  if exist %%F (
    echo OK      %%F
  ) else (
    echo MISSING %%F
    set missing=1
  )
)

echo.
if "%missing%"=="0" (
  echo All required files are present.
) else (
  echo Some files are missing.
)
pause

