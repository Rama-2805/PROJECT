@echo off
REM =========================================================================
REM SmartCampus AI — Windows Setup Script
REM One-command environment setup for development and demo
REM =========================================================================

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║     SmartCampus AI — Setup                      ║
echo  ║     "The Future of Intelligent Education"        ║
echo  ╚══════════════════════════════════════════════════╝
echo.

setlocal enabledelayedexpansion

REM ─── Check prerequisites ──────────────────────────────────────────
echo [1/5] Checking prerequisites...

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed.
    pause
    exit /b 1
)

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Python not found. Install Python 3.12+ from https://python.org
)

where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Docker not found. Install Docker Desktop from https://docker.com
)

echo    ✓ Node.js found
echo    ✓ npm found
echo.

REM ─── Configure Environment ──────────────────────────────────────
echo [2/5] Setting up environment...

if not exist .env (
    copy .env.development .env >nul
    echo    ✓ Created .env from .env.development template
) else (
    echo    ✓ .env already exists
)

REM ─── Install API Dependencies ───────────────────────────────────
echo [3/5] Installing API dependencies...

cd api
if not exist node_modules (
    call npm ci
    echo    ✓ API dependencies installed
) else (
    echo    ✓ API dependencies already installed
)
cd ..

REM ─── Install Web Dependencies ───────────────────────────────────
echo [4/5] Installing Web dependencies...

cd web
if not exist node_modules (
    call npm ci
    echo    ✓ Web dependencies installed
) else (
    echo    ✓ Web dependencies already installed
)
cd ..

REM ─── Install AI Service Dependencies ────────────────────────────
echo [5/5] Installing AI service dependencies...

if exist apps\ai-service\requirements.txt (
    cd apps\ai-service
    if exist requirements.txt (
        pip install -r requirements.txt --quiet 2>nul
        if !ERRORLEVEL! EQU 0 (
            echo    ✓ AI service dependencies installed
        ) else (
            echo    WARNING: AI service dependencies may be incomplete
        )
    )
    cd ..\..
)

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║     Setup Complete!                             ║
echo  ║                                                 ║
echo  ║     Run start.bat to launch the platform        ║
echo  ║     Or use: docker compose up -d                ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  Quick Start:
echo    start.bat              Launch all services
echo    npm run dev:all        Launch with demo mode
echo    docker compose up -d   Docker deployment
echo.
pause
