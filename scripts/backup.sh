#!/bin/bash
# SmartCampus AI — Automated Database Backup Script
# Usage: ./scripts/backup.sh [database_name] [output_dir]

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────
DB_NAME="${1:-smartcampus}"
BACKUP_DIR="${2:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="smartcampus_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}SmartCampus AI — Database Backup${NC}"
echo "========================================"

# ─── Create backup directory ────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

# ─── Perform backup ─────────────────────────────────────────────
echo -e "${YELLOW}[1/3]${NC} Creating backup of database: ${DB_NAME}..."

if pg_dump \
  --host="${PGHOST:-localhost}" \
  --port="${PGPORT:-5432}" \
  --username="${PGUSER:-smartcampus}" \
  --dbname="${DB_NAME}" \
  --format=custom \
  --verbose \
  --no-owner \
  --compress=9 \
  --file="${BACKUP_DIR}/${BACKUP_FILE}" 2>&1; then
  echo -e "${GREEN}✓${NC} Backup completed: ${BACKUP_DIR}/${BACKUP_FILE}"
else
  echo -e "${RED}✗ Backup failed${NC}"
  exit 1
fi

# ─── Calculate backup size ──────────────────────────────────────
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
echo -e "${YELLOW}[2/3]${NC} Backup size: ${BACKUP_SIZE}"

# ─── Rotate old backups ─────────────────────────────────────────
echo -e "${YELLOW}[3/3]${NC} Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "smartcampus_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo -e "${GREEN}✓${NC} Old backups cleaned"

# ─── Optional: Upload to S3 ────────────────────────────────────
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  echo "Uploading to S3: ${S3_BACKUP_BUCKET}..."
  if command -v aws &> /dev/null; then
    aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BACKUP_BUCKET}/database/"
    echo -e "${GREEN}✓${NC} S3 upload complete"
  else
    echo -e "${RED}✗ AWS CLI not found, skipping S3 upload${NC}"
  fi
fi

echo ""
echo -e "${GREEN}Backup complete!${NC}"
echo "  File: ${BACKUP_DIR}/${BACKUP_FILE}"
echo "  Size: ${BACKUP_SIZE}"
echo "  Time: $(date)"
