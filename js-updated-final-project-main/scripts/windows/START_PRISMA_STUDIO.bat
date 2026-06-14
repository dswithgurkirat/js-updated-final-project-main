@echo off
setlocal
cd /d "%~dp0..\..\apps\api"
echo Starting Prisma Studio at http://localhost:5555
npx prisma studio --schema prisma/schema.prisma --port 5555

