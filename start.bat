@echo off
cd /d "%~dp0"
title SteamSort - Steam Library Categorizer

echo ==========================================================
echo          SteamSort - Steam Library Categorizer
echo ==========================================================
echo.

node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not found in system PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [1/3] Installing dependencies...
    call pnpm install >nul 2>&1 || call npm install
)

if not exist dist (
    echo [2/3] Building frontend UI...
    call pnpm run build >nul 2>&1 || call npm run build
)

echo [3/3] Starting SteamSort local service...
echo.
echo ==========================================================
echo Server running at: http://localhost:3001
echo Opening browser... Close this window to stop the server.
echo ==========================================================
echo.

start http://localhost:3001

node server/index.js

pause
