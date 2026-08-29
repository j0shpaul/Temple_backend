# TEMPLE DIGITAL PLATFORM — PRODUCTION GO-LIVE CHECKLIST

This checklist tracks the exact production readiness status across code implementation, cloud infrastructure accounts, payment gateway credentials, SMS delivery, and operational verification.

---

## A. CODE READY — 🟢 COMPLETE
- [x] **Fail-Closed Configuration**: Startup validation schema (`src/config/validation.ts`) enforces strict fail-closed checks when `NODE_ENV=production`. 🟢 COMPLETE
- [x] **CORS Hardening**: Wildcard CORS (`*`) is strictly forbidden in production mode (`src/main.ts`). 🟢 COMPLETE
- [x] **OTP Security**: Plaintext OTPs are never stored in Redis. All OTPs are hashed using SHA-256 (`createHash("sha256")`) prior to storage. Plaintext OTPs are excluded from production API responses and logs. 🟢 COMPLETE
- [x] **Cashfree Security**: Payment order creation and webhook signature checks hardened with constant-time comparison (`safeStringCompare`). Test signature bypass is blocked in production. 🟢 COMPLETE
- [x] **Booking Concurrency**: Slot reservations (Puja, Seva, Darshan, Accommodation, Mahaprasad) enforce capacity limits atomically at the database level (`updateMany` with `bookedCount: { lte: capacity - qty }` inside `$transaction`). 🟢 COMPLETE
- [x] **Payment Idempotency**: Payment records enforce database unique constraints on entity IDs and webhook event IDs (`PaymentEvent`). 🟢 COMPLETE
- [x] **Dependency Cleanup**: Unused `razorpay` package removed from `package.json`. Provider-neutral `PaymentGateway` interface introduced. 🟢 COMPLETE
- [x] **Health Checks**: `/api/v1/health/live` (liveness) and `/api/v1/health/ready` (readiness for DB & Redis) active. 🟢 COMPLETE
- [x] **Unit & Integration Test Suite**: 246 tests passing across 23 test suites (`npm test`). 🟢 COMPLETE
- [x] **Build Verification**: SWC TypeScript compilation clean (`npm run build`). 🟢 COMPLETE

---

## B. DATABASE READY — 🟡 WAITING FOR EXTERNAL ACCOUNT/CONFIGURATION
- [x] **Prisma Schema & Relations**: Fully validated (`npx prisma validate`). 🟢 COMPLETE
- [x] **Migration Strategy**: `npx prisma migrate deploy` documented for production pre-deployment step. 🟢 COMPLETE
- [ ] **Production Managed PostgreSQL Host**: Account creation on Supabase Pro / Neon / AWS RDS. 🟡 WAITING FOR EXTERNAL ACCOUNT
- [ ] **PgBouncer Connection Pooling**: Configure `DATABASE_URL` (pooler port 6543) and `DIRECT_URL` (port 5432). 🟡 WAITING FOR EXTERNAL CONFIGURATION

---

## C. REDIS READY — 🟡 WAITING FOR EXTERNAL ACCOUNT/CONFIGURATION
- [x] **Redis Client Integration**: `ioredis` configured with TLS support (`rediss://`). 🟢 COMPLETE
- [ ] **Production Managed Redis Host**: Instance creation on Upstash / ElastiCache. 🟡 WAITING FOR EXTERNAL ACCOUNT
- [ ] **Production Redis URL**: Configure `REDIS_URL` in production environment. 🟡 WAITING FOR EXTERNAL CONFIGURATION

---

## D. MSG91 READY — 🟡 WAITING FOR EXTERNAL ACCOUNT/CONFIGURATION
- [x] **MSG91 Integration Code**: `Msg91SmsProvider` and `SmsService` (`src/modules/auth/sms/`) fully implemented. 🟢 COMPLETE
- [ ] **TRAI DLT Registration**: Indian DLT entity, sender ID, and content template registration. 🟡 WAITING FOR EXTERNAL REGISTRATION
- [ ] **MSG91 Credentials**: Obtain `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, and `MSG91_DLT_TE_ID`. 🟡 WAITING FOR EXTERNAL CREDENTIALS
- [ ] **SMS Delivery Verification**: Verify physical SMS receipt on real Indian mobile device. 🟡 WAITING FOR MANUAL VERIFICATION

---

## E. CASHFREE READY — 🟡 WAITING FOR EXTERNAL ACCOUNT/CONFIGURATION
- [x] **Cashfree Integration Code**: `CashfreeService` fully implemented and hardened for Cashfree production REST API. 🟢 COMPLETE
- [ ] **Cashfree Merchant KYC Account**: Business verification and bank account linking on Cashfree Merchant Dashboard. 🟡 WAITING FOR EXTERNAL ACCOUNT
- [ ] **Production API Keys**: Obtain `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, and `CASHFREE_WEBHOOK_SECRET`. 🟡 WAITING FOR EXTERNAL CREDENTIALS
- [ ] **Webhook Endpoint URL**: Set webhook URL in Cashfree Dashboard to `https://api.yourtemple.org/api/v1/payments/webhook`. 🟡 WAITING FOR EXTERNAL CONFIGURATION

---

## F. STORAGE READY — 🟡 WAITING FOR EXTERNAL ACCOUNT/CONFIGURATION
- [x] **Media Upload Service**: Pre-signed upload signature generator implemented with path sanitization. 🟢 COMPLETE
- [ ] **S3 / Cloudinary Bucket Creation**: AWS S3 or Cloudflare R2 bucket created. 🟡 WAITING FOR EXTERNAL ACCOUNT
- [ ] **Storage Environment Variables**: Configure `S3_BUCKET_NAME` or `CLOUDINARY_*` variables. 🟡 WAITING FOR EXTERNAL CONFIGURATION

---

## G. HOSTING READY — 🟡 WAITING FOR EXTERNAL ACCOUNT/CONFIGURATION
- [x] **Production Build Configuration**: `Dockerfile`, `render.yaml`, PM2 ecosystem files created. 🟢 COMPLETE
- [ ] **Hosting Provider Account**: Render / Railway / AWS App Runner instance creation. 🟡 WAITING FOR EXTERNAL ACCOUNT
- [ ] **Environment Secret Injection**: Inject all required production environment variables into hosting provider dashboard. 🟡 WAITING FOR EXTERNAL CONFIGURATION

---

## H. DOMAIN/HTTPS READY — 🟡 WAITING FOR EXTERNAL ACCOUNT/CONFIGURATION
- [ ] **Custom Domain Registration**: DNS A / CNAME records configured for `api.yourtemple.org`. 🟡 WAITING FOR EXTERNAL DOMAIN
- [ ] **SSL/TLS Certificate**: Let's Encrypt / Cloudflare SSL certificate active for HTTPS. 🟡 WAITING FOR EXTERNAL CONFIGURATION

---

## I. BACKUPS READY — 🟢 COMPLETE
- [x] **Automated Backup Script**: `scripts/backup.sh` supporting `pg_dump` custom dumps, SHA-256 checksums, offsite S3 shipping, and 14-day local retention. 🟢 COMPLETE
- [x] **Disaster Recovery Restore Script**: `scripts/restore.sh` supporting checksum integrity validation and database restoration. 🟢 COMPLETE
- [ ] **Cron Scheduler**: Configure daily backup cron trigger on production server. 🟡 WAITING FOR DEPLOYMENT CRON

---

## J. FINAL MANUAL VERIFICATION — 🟡 WAITING FOR EXTERNAL ACCOUNT/CONFIGURATION
- [ ] **Live OTP Verification**: Request and verify live OTP SMS on real mobile number. 🟡 WAITING
- [ ] **Live Payment & Webhook Verification**: Perform live ₹1 Cashfree test payment and verify webhook execution. 🟡 WAITING
- [ ] **Live Booking & QR Check-In Verification**: Create booking, receive QR token, and verify admin check-in. 🟡 WAITING

---

## Final Production Readiness Summary

| Category | Status |
|---|---|
| **CODE STATUS** | 🟢 **COMPLETE (100% Hardened & Tested)** |
| **EXTERNAL INFRASTRUCTURE STATUS** | 🟡 **WAITING FOR EXTERNAL ACCOUNTS & CREDENTIALS** |
| **PRODUCTION GO-LIVE STATUS** | 🔴 **NO-GO (Awaiting External Accounts Setup)** |
