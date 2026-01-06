@echo off
TITLE Git Pull Changes
SET BASE_DIR=%~dp0
CD /D "%BASE_DIR%"

echo ==========================================
echo    Git Pull - Downloading Changes
echo ==========================================
echo.

echo [1/1] Pulling changes from GitHub...
git pull

echo.
echo ==========================================
echo    Done! Your local code is up to date.
echo ==========================================
echo.
pause
