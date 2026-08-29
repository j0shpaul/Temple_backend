# Temple Digital Platform — Disaster Recovery & Backup Runbook

## 1. Objectives & Metrics

| Metric | Target | Description |
|---|---|---|
| **RPO** (Recovery Point Objective) | **< 1 Hour** (or continuous via WAL) | Maximum acceptable data loss duration in a catastrophic outage. |
| **RTO** (Recovery Time Objective) | **< 15 Minutes** | Maximum acceptable duration to restore database and resume traffic. |

---

## 2. Backup Architecture & Strategy

```text
[ PostgreSQL Primary Database ]
            │
            ├── Continuous WAL Streaming (Managed Cloud PITR: 7–30 Days)
            │
            └── Daily / Hourly Logical Snapshot (`scripts/backup.sh`)
                        │
                        ├── Custom Compressed Archive Format (-F c)
                        ├── SHA-256 Checksum Generation (.sha256)
                        ├── Local Retention Policy (14 Days)
                        └── Encrypted Offsite S3 Bucket (`s3://temple-backups/`)
```

---

## 3. Automated Backup Execution

### Running Logical Backups
To take an on-demand snapshot:
```bash
./scripts/backup.sh ./backups
```

The script will:
1. Extract `DATABASE_URL` safely.
2. Dump all schemas, tables, BLOBs, and sequences with `pg_dump -F c`.
3. Compute and write the SHA-256 checksum to `temple_backup_<TIMESTAMP>.dump.sha256`.
4. Upload to remote S3 storage if `S3_BACKUP_BUCKET` is configured.
5. Prune local archives older than `BACKUP_RETENTION` (14 days).

---

## 4. Disaster Recovery & Restoration Procedure

### Scenario A: Cloud Provider Point-In-Time Recovery (PITR)
If using Supabase, AWS RDS, Neon, or GCP Cloud SQL:
1. Navigate to the Cloud Database Console.
2. Select **Backups / Point-in-Time Recovery**.
3. Choose the exact timestamp prior to data corruption/incident (e.g. `2026-08-24 14:30:00 UTC`).
4. Restore to a new database instance.
5. Update `DATABASE_URL` in the production environment / secret manager.
6. Restart NestJS API instances (`pm2 restart all`).

### Scenario B: Restoring from Dump File (`scripts/restore.sh`)
If restoring to a fresh or existing database instance:

```bash
# 1. Download the target backup file and checksum from offsite storage
aws s3 cp s3://temple-backups/temple_backup_20260824_120000.dump ./backups/
aws s3 cp s3://temple-backups/temple_backup_20260824_120000.dump.sha256 ./backups/

# 2. Run the safe restore script
./scripts/restore.sh ./backups/temple_backup_20260824_120000.dump
```

The script validates the SHA-256 checksum, requires typing `RESTORE_TEMPLE_DATABASE` to prevent accidental overwrites, and executes `pg_restore` cleanly.

### Step 3: Post-Restore Verification Checklist
1. **Validate Migration State**:
   ```bash
   npx prisma migrate status
   ```
2. **Execute Health Check**:
   ```bash
   curl -I https://api.temple.example.com/api/v1/health/ready
   ```
3. **Verify Data Integrity**:
   - Devotee User count
   - Recent Bookings & Payments state
   - Room availability
4. **Flush / Invalidate Redis BFF Caches**:
   ```bash
   # If Redis contains stale cache keys prior to restored DB state:
   redis-cli -u $REDIS_URL FLUSHDB
   ```
5. **Resume Traffic** by enabling Load Balancer routing.

---

## 5. Routine Disaster Recovery Drills
- Conduct monthly restoration tests on a staging environment.
- Confirm all tables and constraints are intact.
- Verify that Cashfree webhook deduplication keys and payment records match external gateway transaction logs.
