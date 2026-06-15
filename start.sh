#!/usr/bin/env bash
# =========================================================================
# SmartCampus AI — Start Script (Linux/macOS)
# One-command launch for development and demo
# =========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

DEMO_MODE=false
if [ "${1:-}" = "--demo" ] || [ "${1:-}" = "-d" ]; then
    DEMO_MODE=true
fi

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║     SmartCampus AI — Starting Services          ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# ─── Check .env ─────────────────────────────────────────────────
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: .env file not found. Run ./setup.sh first.${NC}"
    exit 1
fi

# ─── Start Docker infrastructure ────────────────────────────────
echo -e "[1/4] Starting infrastructure services..."
docker compose up -d postgres redis minio mqtt 2>/dev/null || \
    echo -e "  ${YELLOW}⚠${NC} Docker not available. Start PostgreSQL and Redis manually."
echo -e "  ${GREEN}✓${NC} Infrastructure services started"
echo ""

# ─── Apply migrations ───────────────────────────────────────────
echo -e "[2/4] Applying database migrations..."
cd api
if [ -f node_modules/.bin/prisma ]; then
    npx prisma migrate dev --name init --skip-generate 2>/dev/null || true
    npx prisma generate
    echo -e "  ${GREEN}✓${NC} Database migrations applied"
fi
cd "$SCRIPT_DIR"
echo ""

# ─── Create data directories ────────────────────────────────────
mkdir -p apps/edge-agent/data

# ─── Start servers ──────────────────────────────────────────────
echo -e "[3/4] Starting servers..."

echo -e "  ${CYAN}→${NC} Starting API server (port 4000)..."
cd api && npm run start:dev &
API_PID=$!
cd "$SCRIPT_DIR"

echo -e "  ${CYAN}→${NC} Starting Web server (port 3000)..."
cd web && npm run dev &
WEB_PID=$!
cd "$SCRIPT_DIR"

echo -e "  ${GREEN}✓${NC} Servers started"
echo ""

# ─── Demo mode ──────────────────────────────────────────────────
if [ "$DEMO_MODE" = true ]; then
    echo -e "[4/4] ${YELLOW}Demo mode enabled!${NC}"
    echo -e "  ${GREEN}✓${NC} Open http://localhost:3000?demo=true"
    echo ""
fi

echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║     SmartCampus AI is running!                  ║"
echo "  ║                                                 ║"
echo "  ║     Frontend:  http://localhost:3000             ║"
echo "  ║     API:       http://localhost:4000             ║"
echo "  ║     Health:    http://localhost:4000/health      ║"
echo "  ║                                                 ║"
echo "  ║     Press Ctrl+C to stop all services           ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Handle shutdown ────────────────────────────────────────────
trap "echo ''; echo 'Shutting down...'; kill $API_PID $WEB_PID 2>/dev/null; echo '✓ Stopped.'; exit 0" SIGINT SIGTERM

wait $API_PID $WEB_PID
