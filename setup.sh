#!/usr/bin/env bash
# =========================================================================
# SmartCampus AI — Setup Script (Linux/macOS)
# =========================================================================

set -euo pipefail

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 20+."
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/scripts/setup.js"
