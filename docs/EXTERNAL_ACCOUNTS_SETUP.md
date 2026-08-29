# TEMPLE DIGITAL PLATFORM — EXTERNAL ACCOUNTS & CREDENTIALS SETUP MANUAL

This document provides step-by-step instructions for creating, configuring, and verifying every external service, cloud account, and API credential required for the **Temple Digital Platform** backend to operate in production.

---

## 1. Managed PostgreSQL Database

### Why Required
PostgreSQL 16+ is the **authoritative source of truth** for all transactional and permanent business data, including users, bookings, slot capacity, payments, receipts, temple schedules, and audit logs.

### Account to Create
- **Provider Options**: Supabase Pro, Neon Enterprise, AWS RDS PostgreSQL, Google Cloud SQL, or Render Postgres.
- **Paid Plan Required?**: Optional for staging/dev, **Required for Production** (to enable PgBouncer connection pooling, SSL/TLS, automated daily snapshots, and high availability).

### Credentials Required
- Database Username
- Database Password
- Pooler Hostname & Port (typically `6543`)
- Direct Hostname & Port (typically `5432`)
- Database Name (e.g. `temple_prod`)

### Environment Variables
```ini
DATABASE_URL=postgresql://<user>:<password>@<pooler_host>:6543/<dbname>?sslmode=require&connection_limit=20
DIRECT_URL=postgresql://<user>:<password>@<direct_host>:5432/<dbname>?sslmode=require
```

### Where Consumed in Code
- `DATABASE_URL`: `src/modules/prisma/prisma.service.ts` via `@prisma/client`
- `DIRECT_URL`: `prisma/schema.prisma` for Prisma CLI migrations (`npx prisma migrate deploy`)

### Production Configuration Steps
1. Create a PostgreSQL 16+ instance in your cloud database provider.
2. Enable PgBouncer / Transaction Connection Pooler.
3. Enforce SSL mode (`sslmode=require`).
4. Copy connection string to `DATABASE_URL` (pooler) and `DIRECT_URL` (direct).

### Security Requirements
- Database password must be a cryptographically random 32+ character string.
- Never grant superuser privileges to the application database user.
- Restrict network access to trusted IP addresses of your backend hosting server.

### Manual Verification Procedure
```bash
# Verify direct migration connection
npx prisma migrate status

# Verify pooler connection from backend environment
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.\$queryRaw\`SELECT 1\`.then(() => console.log('DB OK')).catch(console.error);"
```

---

## 2. Managed Redis Instance

### Why Required
Redis 7+ is required for ephemeral state management:
- SHA-256 hashed OTP storage and TTL expiration
- Rate-limiting counters (`RateLimitGuard`)
- JWT refresh token revocation (`refresh:<token>`)
- Distributed reservation cleanup locks (`lock:reservation_cleanup`)
- Page-level aggregation caching (`pages.service.ts`)

### Account to Create
- **Provider Options**: Upstash Redis (Serverless TLS), AWS ElastiCache, Redis Cloud, or Render Redis.
- **Paid Plan Required?**: Recommended for Production (to guarantee memory persistence and SLA).

### Credentials Required
- Redis Endpoint Hostname & Port (typically `6379`)
- Redis Password / Authentication Token

### Environment Variables
```ini
REDIS_URL=rediss://default:<password>@<redis_host>:6379
```

### Where Consumed in Code
- `src/modules/redis/redis.service.ts` via `ioredis`

### Production Configuration Steps
1. Create a Redis 7+ instance in Upstash or AWS ElastiCache.
2. Enable TLS/SSL (`rediss://` protocol prefix).
3. Set `maxmemory-policy` to `volatile-lru` or `noeviction` (do NOT evict unexpired OTPs or refresh tokens).

### Security Requirements
- Require strong password authentication.
- Enforce TLS in transit (`rediss://`).

### Manual Verification Procedure
```bash
# Test Redis ping via node ioredis
node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(res => console.log('Redis Ping:', res)).finally(() => r.quit());"
```

---

## 3. Cashfree Production Merchant Account

### Why Required
Cashfree Payment Gateway processes real INR money transactions, payment session creation, refund processing, and asynchronous payment status webhooks.

### Account to Create
- **Merchant Portal**: https://merchant.cashfree.com/
- **Paid Plan Required?**: Merchant account setup is free, but Cashfree charges standard transaction processing fees per transaction. Requires business registration and bank account KYC verification.

### Credentials Required
- Production Client App ID (`CASHFREE_APP_ID`)
- Production Secret Key (`CASHFREE_SECRET_KEY`)
- Production Webhook Signing Secret (`CASHFREE_WEBHOOK_SECRET`)

### Environment Variables
```ini
CASHFREE_APP_ID=your_cashfree_production_app_id
CASHFREE_SECRET_KEY=your_cashfree_production_secret_key
CASHFREE_WEBHOOK_SECRET=your_cashfree_webhook_signing_secret
CASHFREE_ENVIRONMENT=production
```

### Where Consumed in Code
- `src/modules/payments/cashfree.service.ts`
- `src/modules/payments/payment.service.ts`

### Production Configuration Steps
1. Complete Cashfree Merchant KYC and bank account verification.
2. Log into Cashfree Merchant Dashboard -> Switch to **Production** mode.
3. Generate Production API Keys (`App ID` & `Secret Key`).
4. Set Webhook URL in Cashfree Dashboard: `https://api.yourtemple.org/api/v1/payments/webhook`.
5. Select webhook events: `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `USER_DROPPED`, `REFUND_STATUS`.
6. Copy Webhook Secret to `CASHFREE_WEBHOOK_SECRET`.

### Security Requirements
- Never expose Cashfree secret keys in client code or Git repository.
- Verify signature in `payment.service.ts` using constant-time HMAC-SHA256 comparison. Test signatures are strictly blocked when `NODE_ENV=production`.

### Manual Verification Procedure
1. Create a test booking using `POST /api/v1/payments/booking/:bookingId`.
2. Verify that Cashfree returns a valid live payment session URL.
3. Complete a live payment of ₹1 and verify webhook execution.

---

## 4. MSG91 Production SMS Account (India DLT Compliant)

### Why Required
MSG91 delivers real 6-digit OTP SMS messages to Indian mobile numbers (+91) for devotee registration and login.

### Account to Create
- **Portal**: https://msg91.com/
- **Paid Plan Required?**: Yes (SMS credit package purchase required).

### India-Specific Requirements (TRAI DLT Registration)
In India, Telecom Regulatory Authority of India (TRAI) mandates DLT (Distributed Ledger Technology) registration for sending transactional SMS:
1. Register Entity on a DLT portal (e.g., Vilpower, Jio DLT, Airtel DLT, Vodafone DLT).
2. Get Header/Sender ID approved (e.g. `TEMPLE`).
3. Get Content Template approved for OTP:
   - Example Template: `{#var#} is your OTP for Temple Digital Platform login. Valid for 5 minutes. Do not share.`
4. Register DLT Template ID (`MSG91_DLT_TE_ID`) in MSG91 dashboard.

### Credentials Required
- MSG91 Auth Key (`MSG91_AUTH_KEY`)
- Approved Sender ID (`MSG91_SENDER_ID`)
- Approved DLT Template ID (`MSG91_DLT_TE_ID`)

### Environment Variables
```ini
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=your_msg91_production_auth_key
MSG91_SENDER_ID=TEMPLE
MSG91_DLT_TE_ID=your_approved_dlt_template_id
```

### Where Consumed in Code
- `src/modules/auth/sms/msg91-sms.provider.ts`
- `src/modules/auth/sms/sms.service.ts`

### Manual Verification Procedure
1. Send OTP request: `POST /api/v1/auth/send-otp` with real Indian mobile number.
2. Confirm receipt of physical SMS on mobile device.
3. Confirm that the API response DOES NOT return the OTP in production.

---

## 5. Object Storage (AWS S3 / Cloudflare R2 / Cloudinary)

### Why Required
Generates presigned upload signatures allowing client applications to upload temple photos, gallery images, and document media directly to object storage.

### Account to Create
- **Provider Options**: AWS S3, Cloudflare R2 (No egress fees), or Cloudinary.
- **Paid Plan Required?**: Optional (Free tier available: Cloudflare R2 provides 10GB free, Cloudinary provides 25GB free).

### Credentials Required (for AWS S3 / R2)
- Bucket Name (`S3_BUCKET_NAME`)
- Custom Endpoint (`S3_ENDPOINT`) if using Cloudflare R2 / MinIO

### Credentials Required (for Cloudinary)
- Cloud Name (`CLOUDINARY_CLOUD_NAME`)
- API Key (`CLOUDINARY_API_KEY`)
- API Secret (`CLOUDINARY_API_SECRET`)

### Environment Variables
```ini
STORAGE_PROVIDER=s3
S3_BUCKET_NAME=temple-production-assets
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

### Where Consumed in Code
- `src/modules/gallery/media-upload.service.ts`

### Manual Verification Procedure
1. Send presigned URL request: `POST /api/v1/gallery/upload-url` (Staff/Admin token).
2. Verify returned presigned `uploadUrl` and `publicUrl`.

---

## 6. What Must NEVER Be Committed to Git

The following files and values must NEVER be committed to Git:
- `.env` files containing real production secrets
- `JWT_SECRET` and `JWT_REFRESH_SECRET`
- `CASHFREE_SECRET_KEY` and `CASHFREE_WEBHOOK_SECRET`
- `MSG91_AUTH_KEY`
- Database passwords in `DATABASE_URL`
- Redis passwords in `REDIS_URL`
- AWS / Cloudinary secret keys

Ensure `.gitignore` contains:
```gitignore
.env
.env.production
*.pem
*.key
backups/
```
