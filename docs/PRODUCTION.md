# TEMPLE DIGITAL PLATFORM — PRODUCTION OPERATIONAL MANUAL

This manual documents the production architecture, security controls, provider integrations, database migration procedures, disaster recovery protocols, and operational workflows for the **Temple Digital Platform** backend.

---

## 1. Production Architecture Overview

```text
                            Devotee Mobile / Web Clients
                                        │
                                        ▼
                             Cloudflare / WAF Proxy
                                 (HTTPS, DDoS)
                                        │
                         ┌──────────────┼──────────────┐
                         ▼              ▼              ▼
                    NestJS API 1   NestJS API 2   NestJS API 3
                         │              │              │
                         └──────────────┼──────────────┘
                                        │
                  ┌─────────────────────┼─────────────────────┐
                  ▼                     ▼                     ▼
      Managed PostgreSQL 16+       Managed Redis 7+     MSG91 / Cashfree Gateway
     (PgBouncer Pooler :6543)    (Upstash TLS :6379)    (Transactional OTP & INR)
```

---

## 2. Infrastructure Requirements & Provider Setup

### A. Managed PostgreSQL 16+
- **Recommended Hosts**: Supabase Pro, Neon Enterprise, AWS RDS PostgreSQL.
- **Connection Mode**: Connect using PgBouncer transaction pooler (`DATABASE_URL` port `6543`) with `sslmode=require`.
- **Direct Connection (`DIRECT_URL`)**: Required for Prisma CLI schema migrations on port `5432`.

### B. Managed Redis 7+
- **Recommended Hosts**: Upstash Redis (Serverless TLS), AWS ElastiCache.
- **Connection String**: `REDIS_URL` starting with `rediss://` for TLS encryption in transit.

### C. Cashfree Production Payment Gateway
- **Dashboard**: https://merchant.cashfree.com/
- **Credentials**: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET`.
- **Environment**: Set `CASHFREE_ENVIRONMENT=production`.
- **Webhook Endpoint**: `POST https://api.yourtemple.org/api/v1/payments/webhook`

### D. MSG91 Production SMS (India DLT Compliant)
- **Dashboard**: https://msg91.com/
- **Requirements**: MSG91 Auth Key (`MSG91_AUTH_KEY`), Approved Sender ID (`MSG91_SENDER_ID`), Approved DLT Template ID (`MSG91_DLT_TE_ID`).
- **India DLT Compliance**: Registration on TRAI DLT portal (e.g. Jio/Airtel DLT) is mandatory for transactional OTP delivery to Indian mobile numbers (+91).

### E. Object Storage (AWS S3 / Cloudflare R2 / Cloudinary)
- Direct presigned uploads for media assets. `S3_BUCKET_NAME` or `CLOUDINARY_*` credentials required when media uploads are enabled in production.

---

## 3. Production Environment Variables Specification

| Variable | Description | Production Requirement |
|---|---|---|
| `NODE_ENV` | Environment identifier | Must be `production` |
| `PORT` | Web server port | Default `3000` |
| `CORS_ORIGINS` | Allowed CORS origins | Required (explicit domain allowlist; `*` prohibited) |
| `DATABASE_URL` | PostgreSQL pooler URL | Required |
| `DIRECT_URL` | PostgreSQL direct URL | Required for `npx prisma migrate deploy` |
| `REDIS_URL` | Redis TLS URL | Required (`rediss://...`) |
| `JWT_SECRET` | Access token secret | Required (Min 32 random chars via `openssl rand -base64 32`) |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required (Min 32 random chars, distinct from `JWT_SECRET`) |
| `CASHFREE_APP_ID` | Merchant App ID | Required |
| `CASHFREE_SECRET_KEY` | Merchant Secret Key | Required |
| `CASHFREE_WEBHOOK_SECRET` | Webhook signing secret | Required |
| `CASHFREE_ENVIRONMENT` | Payment environment | Must be `production` |
| `SMS_PROVIDER` | SMS Provider engine | Set to `msg91` |
| `MSG91_AUTH_KEY` | MSG91 API key | Required when `SMS_PROVIDER=msg91` |
| `MSG91_SENDER_ID` | Approved Sender Header | Required |
| `MSG91_DLT_TE_ID` | DLT Template ID | Required |
| `STORAGE_PROVIDER` | Object storage engine | `s3` or `cloudinary` |

---

## 4. Database Migration & Deployment Strategy

To prevent race conditions, locking conflicts, or destructive migration issues during multi-instance deployment:

### Zero-Downtime Migration Deployment Order:
1. **Pre-Deployment Backup**: Execute automated PostgreSQL backup script:
   ```bash
   ./scripts/backup.sh /var/backups/temple
   ```
2. **Run Prisma Migration**: Apply pending schema migrations separately prior to launching new app containers:
   ```bash
   npx prisma migrate deploy
   ```
3. **Deploy Application Instances**: Deploy container pods (Docker / Render / PM2).
4. **Post-Deployment Verification**: Validate application health:
   ```bash
   curl -f https://api.yourtemple.org/api/v1/health/ready
   ```

---

## 5. Automated Backup & Disaster Recovery Protocols

- **Local Backup Execution**:
  ```bash
  ./scripts/backup.sh ./backups
  ```
- **Disaster Recovery Restore Procedure**:
  ```bash
  ./scripts/restore.sh ./backups/temple_backup_YYYYMMDD_HHMMSS.dump --confirm
  ```
- **RPO (Recovery Point Objective)**: < 1 hour (via daily full dumps + WAL archiving).
- **RTO (Recovery Time Objective)**: < 15 minutes (via automated restore script).

---

## 6. Health Checks & Monitoring Probes

| Endpoint | Probe Type | Purpose | Expected Status Code |
|---|---|---|---|
| `/api/v1/health/live` | **Liveness** | Verifies NestJS HTTP process is running | `200 OK` |
| `/api/v1/health/ready` | **Readiness** | Verifies DB and Redis connectivity | `200 OK` |

---

## 7. Production Go-Live Checklist

- [ ] `NODE_ENV=production` set in environment.
- [ ] Cryptographically random 32+ char `JWT_SECRET` and `JWT_REFRESH_SECRET` set.
- [ ] `CORS_ORIGINS` explicitly configured with production domain(s). Wildcard `*` removed.
- [ ] Managed PostgreSQL (`DATABASE_URL`) and Redis (`REDIS_URL`) connected over TLS.
- [ ] Cashfree production merchant credentials and webhook secret configured.
- [ ] MSG91 auth key, sender ID, and DLT template ID configured.
- [ ] AWS S3 or Cloudflare R2 bucket created and configured for presigned uploads.
- [ ] Automated database backup cron configured.
- [ ] `/api/v1/health/ready` endpoint returns 200 OK.
