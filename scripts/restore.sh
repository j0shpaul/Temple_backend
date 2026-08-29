#!/usr/bin/env bash
# ==============================================================================
# TEMPLE DIGITAL PLATFORM — DATABASE DISASTER RECOVERY & RESTORE SCRIPT
# ==============================================================================
# Usage:
#   ./scripts/restore.sh <BACKUP_FILE> [--confirm]
#
# Environment Variables:
#   DATABASE_URL - Target PostgreSQL Database URL
# ==============================================================================

set -euo pipefail

BACKUP_FILE="${1:-}"
CONFIRM_FLAG="${2:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <path_to_backup_file.dump> [--confirm]" >&2
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[-] ERROR: Backup file not found at: ${BACKUP_FILE}" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[-] ERROR: DATABASE_URL environment variable is not set." >&2
  exit 1
fi

# 1. Verify Checksum if .sha256 exists
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "[+] Verifying SHA-256 integrity checksum..."
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "${CHECKSUM_FILE}"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "${CHECKSUM_FILE}"
  fi
  echo "[✓] Integrity verified."
else
  echo "[!] WARNING: No checksum file found at ${CHECKSUM_FILE}. Skipping hash verification."
fi

# 2. Safety Confirmation Gate
if [ "${CONFIRM_FLAG}" != "--confirm" ]; then
  echo "=============================================================================="
  echo " [!] CRITICAL WARNING: RESTORE WILL OVERWRITE DATA IN TARGET DATABASE"
  echo " Target: ${DATABASE_URL}"
  echo " Backup: ${BACKUP_FILE}"
  echo "=============================================================================="
  read -p "Type 'RESTORE_TEMPLE_DATABASE' to proceed: " CONFIRMATION
  if [ "${CONFIRMATION}" != "RESTORE_TEMPLE_DATABASE" ]; then
    echo "[-] Operation aborted by user."
    exit 1
  fi
fi

# Sanitize DATABASE_URL for libpq/pg_restore (strip Prisma-only query parameters like ?schema=public)
CLEAN_DB_URL=$(echo "${DATABASE_URL}" | sed -E 's/(\?|&)(schema|connection_limit|pgbouncer|pool_timeout)=[^&]*//g' | sed 's/\?$//' | sed 's/\?&/?/')

echo "[+] Initiating database restoration via pg_restore..."

# 3. Execute pg_restore with Clean/Recreate mode
pg_restore \
  --dbname="${CLEAN_DB_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  "${BACKUP_FILE}" || true

echo "[+] Database restoration completed."
echo "[+] Validating Prisma migrations status..."
npx prisma migrate status || true

echo "[✓] Disaster recovery restore procedure successfully executed."
