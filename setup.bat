@echo off
REM =========================================================================
REM SmartCampus AI — Windows Setup Script
REM =========================================================================

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

node scripts/setup.js
pause
