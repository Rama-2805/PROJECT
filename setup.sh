#!/usr/bin/env bash
# =========================================================================
# SmartCampus AI — Setup Script (Linux/macOS)
# One-command environment setup for development and demo
# =========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║     SmartCampus AI — Setup                      ║"
echo "  ║     \"The Future of Intelligent Education\"        ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ─── Check prerequisites ──────────────────────────────────────────
echo -e "[1/5] Checking prerequisites..."

check_cmd() {
    if command -v "$1" &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $1 found"
        return 0
    else
        echo -e "  ${YELLOW}⚠${NC} $1 not found — $2"
        return 1
    fi
}

check_cmd node "Install from https://nodejs.org"
check_cmd npm "Installed with Node.js"
check_cmd python3 "Install from https://python.org"
check_cmd docker "Install from https://docker.com"
echo ""

# ─── Configure Environment ──────────────────────────────────────
echo -e "[2/5] Setting up environment..."
if [ ! -f .env ]; then
    cp .env.development .env
    echo -e "  ${GREEN}✓${NC} Created .env from .env.development template"
else
    echo -e "  ${GREEN}✓${NC} .env already exists"
fi
echo ""

# ─── Install API Dependencies ───────────────────────────────────
echo -e "[3/5] Installing API dependencies..."
cd api
if [ ! -d node_modules ]; then
    npm ci --silent
    echo -e "  ${GREEN}✓${NC} API dependencies installed"
else
    echo -e "  ${GREEN}✓${NC} API dependencies already installed"
fi
cd "$SCRIPT_DIR"
echo ""

# ─── Install Web Dependencies ───────────────────────────────────
echo -e "[4/5] Installing Web dependencies..."
cd web
if [ ! -d node_modules ]; then
    npm ci --silent
    echo -e "  ${GREEN}✓${NC} Web dependencies installed"
else
    echo -e "  ${GREEN}✓${NC} Web dependencies already installed"
fi
cd "$SCRIPT_DIR"
echo ""

# ─── Install AI Service Dependencies ────────────────────────────
echo -e "[5/5] Installing AI service dependencies..."
if [ -f apps/ai-service/requirements.txt ]; then
    cd apps/ai-service
    pip3 install -r requirements.txt --quiet 2>/dev/null && \
        echo -e "  ${GREEN}✓${NC} AI service dependencies installed" || \
        echo -e "  ${YELLOW}⚠${NC} AI service dependencies may be incomplete"
    cd "$SCRIPT_DIR"
fi
echo ""

echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║     Setup Complete!                             ║"
echo "  ║                                                 ║"
echo "  ║     Run ./start.sh to launch the platform       ║"
echo "  ║     Or use: docker compose up -d                ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "  Quick Start:"
echo "    ./start.sh              Launch all services"
echo "    npm run dev:all         Launch with demo mode"
echo "    docker compose up -d    Docker deployment"
echo ""
