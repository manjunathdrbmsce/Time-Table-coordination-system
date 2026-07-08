@echo off
REM ===============================================
REM Database Backup Script for Windows
REM ===============================================
REM Run this script before deploying to server
REM ===============================================

echo.
echo ============================================
echo   Timetable Database Backup Script
echo ============================================
echo.

REM Configuration
SET HOST=localhost
SET PORT=5433
SET USER=postgres
SET DATABASE=timetable_db
SET BACKUP_DIR=backups

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generate timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

SET SQL_FILE=%BACKUP_DIR%\timetable_backup_%TIMESTAMP%.sql
SET DUMP_FILE=%BACKUP_DIR%\timetable_backup_%TIMESTAMP%.dump

echo Backup Configuration:
echo    Host: %HOST%
echo    Port: %PORT%
echo    User: %USER%
echo    Database: %DATABASE%
echo.

REM Prompt for password
set /p PGPASSWORD="Enter PostgreSQL password: "

echo.
echo Creating SQL backup...
pg_dump -h %HOST% -p %PORT% -U %USER% -d %DATABASE% -f "%SQL_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] SQL Backup created: %SQL_FILE%
) else (
    echo [ERROR] SQL Backup failed!
)

echo.
echo Creating compressed dump backup...
pg_dump -h %HOST% -p %PORT% -U %USER% -d %DATABASE% -F c -f "%DUMP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Dump Backup created: %DUMP_FILE%
) else (
    echo [ERROR] Dump Backup failed!
)

REM Clear password
set PGPASSWORD=

echo.
echo ============================================
echo   Backup Complete!
echo ============================================
echo.
echo Files created in %BACKUP_DIR% folder:
echo    - %SQL_FILE%
echo    - %DUMP_FILE%
echo.
echo Next Steps:
echo 1. Copy the entire project folder to your server
echo 2. Follow the instructions in DOCKER_DEPLOYMENT.md
echo.

pause
