@echo off
REM =========================================================================
REM SmartCampus AI — Windows Start Script
REM One-command launch for development and demo
REM =========================================================================

setlocal enabledelayedexpansion

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║     SmartCampus AI — Starting Services          ║
echo  ╚══════════════════════════════════════════════════╝
echo.

REM ─── Parse arguments ────────────────────────────────────────────
set DEMO_MODE=0
if "%1"=="--demo" set DEMO_MODE=1
if "%1"=="-d" set DEMO_MODE=1

REM ─── Check prerequisites ───────────────────────────────────────
if not exist .env (
    echo ERROR: .env file not found. Run setup.bat first.
    pause
    exit /b 1
)

REM ─── Start Docker infrastructure (PostgreSQL, Redis, MinIO, MQTT) ─
echo [1/4] Starting infrastructure services (PostgreSQL, Redis, MinIO, MQTT)...

docker compose up -d postgres redis minio mqtt 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Docker may not be running. Starting services locally...
    echo    Starting without Docker — ensure PostgreSQL and Redis are running.
)

echo    ✓ Infrastructure services started
echo.

REM ─── Apply database migrations ─────────────────────────────────
echo [2/4] Applying database migrations...

cd api
if exist node_modules\.bin\prisma (
    call npx prisma migrate dev --name init --skip-generate 2>nul
    call npx prisma generate
    echo    ✓ Database migrations applied
) else (
    echo    WARNING: Prisma not found. Run setup.bat first.
)
cd ..
echo.

REM ─── Start API & Web Servers ───────────────────────────────────
echo [3/4] Starting servers...

echo    Starting API server (port 4000)...
start "SmartCampus API" cmd /c "cd api && npm run start:dev"

echo    Starting Web server (port 3000)...
start "SmartCampus Web" cmd /c "cd web && npm run dev"

echo    ✓ Servers started
echo.

REM ─── Demo mode ─────────────────────────────────────────────────
if %DEMO_MODE% EQU 1 (
    echo [4/4] Starting demo simulation...
    echo    ✓ Demo mode enabled! Open http://localhost:3000?demo=true
    echo    ✓ AI events will be simulated automatically
    echo.
) else (
    echo [4/4] Skipping demo mode (use start.bat --demo to enable)
    echo.
)

echo  ╔══════════════════════════════════════════════════╗
echo  ║     SmartCampus AI is running!                  ║
echo  ║                                                 ║
echo  ║     Frontend:  http://localhost:3000             ║
echo  ║     API:       http://localhost:4000             ║
echo  ║     API Docs:  http://localhost:4000/api         ║
echo  ║     Health:    http://localhost:4000/health      ║
echo  ║                                                 ║
echo  ║     Press any key to stop all services          ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  Dashboard Pages:
echo    /dashboard          Main dashboard
echo    /dashboard/analytics    Executive analytics
echo    /dashboard/system       System health
echo    /dashboard/devices      Device management
echo    /dashboard/pricing      Subscription plans
echo.

pause >nul

echo.
echo Shutting down services...
taskkill /f /im node.exe 2>nul
echo ✓ All services stopped.
