#!/usr/bin/env bash
# ==============================================================================
# TEMPLE DIGITAL PLATFORM — AUTOMATED POSTGRESQL BACKUP SCRIPT
# ==============================================================================
# Usage:
#   ./scripts/backup.sh [OUTPUT_DIR]
#
# Environment Variables:
#   DATABASE_URL       - PostgreSQL Connection String (required)
#   BACKUP_DIR         - Destination directory (default: ./backups)
#   BACKUP_RETENTION   - Days to keep local backups (default: 14)
#   S3_BACKUP_BUCKET   - Optional S3 bucket to ship encrypted backups
# ==============================================================================

set -euo pipefail

# 1. Configuration
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
RETENTION_DAYS="${BACKUP_RETENTION:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/temple_backup_${TIMESTAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

mkdir -p "${BACKUP_DIR}"

if [ -z "${DATABASE_URL:-}" ]; then
  # Try loading from .env if present
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[-] ERROR: DATABASE_URL environment variable is not set." >&2
  exit 1
fi

# Sanitize DATABASE_URL for libpq/pg_dump (strip Prisma-only query parameters like ?schema=public)
CLEAN_DB_URL=$(echo "${DATABASE_URL}" | sed -E 's/(\?|&)(schema|connection_limit|pgbouncer|pool_timeout)=[^&]*//g' | sed 's/\?$//' | sed 's/\?&/?/')

echo "[+] Starting PostgreSQL backup: ${TIMESTAMP}"
echo "[+] Destination: ${BACKUP_FILE}"

# 2. Execute pg_dump with Custom Archive Format (-F c)
# Includes data, schema, BLOBs, and allows parallel selective restore with pg_restore
pg_dump "${CLEAN_DB_URL}" \
  --format=custom \
  --blobs \
  --verbose \
  --file="${BACKUP_FILE}"

# 3. Generate SHA-256 Checksum for Integrity Verification
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
fi

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[+] Backup successfully created (${FILE_SIZE})"
echo "[+] Checksum saved to ${CHECKSUM_FILE}"

# 4. Optional Offsite Cloud Storage Upload (e.g. AWS S3 / Cloudflare R2)
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    echo "[+] Uploading backup to S3: s3://${S3_BACKUP_BUCKET}/backups/..."
    aws s3 cp "${BACKUP_FILE}" "s3://${S3_BACKUP_BUCKET}/backups/temple_backup_${TIMESTAMP}.dump"
    aws s3 cp "${CHECKSUM_FILE}" "s3://${S3_BACKUP_BUCKET}/backups/temple_backup_${TIMESTAMP}.dump.sha256"
    echo "[+] Offsite backup upload complete"
  else
    echo "[!] WARNING: S3_BACKUP_BUCKET is set but AWS CLI (aws) is not installed."
  fi
fi

# 5. Local Retention Policy Cleanup (Purge dumps older than RETENTION_DAYS)
echo "[+] Pruning local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "temple_backup_*.dump*" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} +

echo "[✓] Backup process completed successfully."
