# JANDALISYS - Run Project (Backend & Frontend)
# This script starts both the backend and frontend servers accessible from:
# 1. Localhost (127.0.0.1)
# 2. Local Network (via your local IP)
# 3. Internet (if port forwarding is configured)

Write-Host "---------------------------------------------------" -ForegroundColor Cyan
Write-Host "   JANDALISYS SYSTEM - FULL STARTUP" -ForegroundColor Cyan
Write-Host "---------------------------------------------------" -ForegroundColor Cyan

# Check for Python
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Python is not installed or not in PATH." -ForegroundColor Red
    exit
}

# Check for Node.js
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js/npm is not installed or not in PATH." -ForegroundColor Red
    exit
}

Write-Host "[1/2] Launching Backend Server (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "python run_server.py" -WindowStyle Normal

Write-Host "[2/2] Launching Frontend Client (Port 5173)..." -ForegroundColor Green
Write-Host "      Accessible at: http://localhost:5173" -ForegroundColor Gray
Write-Host "      Accessible at: http://<your-local-ip>:5173" -ForegroundColor Gray

# Change directory and start frontend in current window to keep logs visible
cd client
npm run dev
