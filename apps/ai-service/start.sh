#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# SmartCampus AI — AI Service Startup Script
# Usage: bash apps/ai-service/start.sh
# ─────────────────────────────────────────────────────────────────────────

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$SCRIPT_DIR"

# Create storage directories
mkdir -p storage/enrollment
mkdir -p storage/faces
mkdir -p vectors

# Detect Python
PYTHON="python3"
if ! command -v python3 &>/dev/null; then
  if command -v python &>/dev/null; then
    PYTHON="python"
  else
    echo "❌ Python not found. Please install Python 3.9+."
    exit 1
  fi
fi
echo "✅ Using: $($PYTHON --version)"

# Check for venv
VENV_DIR="$SCRIPT_DIR/.venv"
if [ -d "$VENV_DIR" ]; then
  echo "✅ Activating existing venv at $VENV_DIR"
  source "$VENV_DIR/bin/activate"
elif [ -f "$SCRIPT_DIR/venv/bin/activate" ]; then
  echo "✅ Activating existing venv at $SCRIPT_DIR/venv"
  source "$SCRIPT_DIR/venv/bin/activate"
else
  echo "🔧 Creating new virtual environment at $VENV_DIR ..."
  $PYTHON -m venv "$VENV_DIR"
  source "$VENV_DIR/bin/activate"
  echo "📦 Installing dependencies..."
  pip install --upgrade pip -q
  # Install CPU-only packages first (skip GPU for Mac)
  grep -v "onnxruntime-gpu" requirements.txt | pip install -r /dev/stdin -q
  echo "✅ Dependencies installed."
fi

# Load .env if it exists at project root
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$' | xargs 2>/dev/null) || true
fi

# Override with ai-service .env if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | grep -v '^$' | xargs 2>/dev/null) || true
fi

# Kill any orphan process currently holding port 8000
OLD_PID=$(lsof -ti:8000 2>/dev/null || true)
if [ -n "$OLD_PID" ]; then
  echo "🧹 Freeing port 8000 (killing process $OLD_PID)..."
  kill -9 $OLD_PID 2>/dev/null || true
  sleep 1
fi

echo ""
echo "🚀 Starting SmartCampus AI Service on port 8000..."
echo "   Docs: http://localhost:8000/docs"
echo "   Storage: $SCRIPT_DIR/storage"
echo ""

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --log-level info
