@echo off
TITLE Git Push Changes
SET BASE_DIR=%~dp0
CD /D "%BASE_DIR%"

echo ==========================================
echo    Git Push - Uploading Changes
echo ==========================================
echo.

echo [1/3] Adding changes...
git add .

echo [2/3] Committing changes...
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg="Update: Automated backup from script"
git commit -m "%commit_msg%"

echo [3/3] Pushing to GitHub...
git push

echo.
echo ==========================================
echo    Done! Changes uploaded to GitHub.
echo ==========================================
echo.
pause
