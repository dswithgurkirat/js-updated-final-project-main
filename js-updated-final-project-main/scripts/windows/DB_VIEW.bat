@echo off
setlocal
cd /d "%~dp0..\.."
echo Users:
docker exec dsr-postgres psql -U postgres -d dsr_db -c "select id, username, email, role, active from modern.users order by id;"
echo.
echo Projects:
docker exec dsr-postgres psql -U postgres -d dsr_db -c "select id, project_name, district, status, created_at from modern.project order by id;"
echo.
echo Files:
docker exec dsr-postgres psql -U postgres -d dsr_db -c "select id, project_id, annexure_id, file_name, object_key, size_bytes from modern.dsr_file order by id;"
pause

