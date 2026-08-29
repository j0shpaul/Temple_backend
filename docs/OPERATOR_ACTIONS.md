# TEMPLE DIGITAL PLATFORM — OPERATOR ACTION PLAN & STEP-BY-STEP MANUAL

This document is the **definitive step-by-step manual for the human operator**. It details every account to create, every portal to log into, every credential to copy, where to put each secret, and how to verify live operations.

---

## ⚠️ CRITICAL OPERATOR RULES
1. **NEVER** paste production API keys, database passwords, or secret tokens into public chat windows, issue trackers, or Git repositories.
2. **NEVER** commit `.env` or `.env.production` files to version control.
3. **NEVER** use `npx prisma migrate reset` in production. Always use `npx prisma migrate deploy`.

---

## STEP 1: Provision Managed PostgreSQL Database

### 1.1 Website / Portal
- **Supabase**: https://supabase.com/
- **Neon**: https://neon.tech/
- **AWS RDS**: https://aws.amazon.com/rds/

### 1.2 Actions to Perform
1. Log into portal and select **Create New Project / Database**.
2. Select PostgreSQL **Version 16** (or latest 15+).
3. Set a strong, randomly generated database password (min 32 characters).
4. Select AWS region **ap-south-1 (Mumbai)** or closest region to your user base.
5. Enable **Connection Pooling (PgBouncer)** on port `6543`.

### 1.3 Credentials to Copy & Environment Variable Mapping
- Copy **Connection Pooler URL** -> Set as `DATABASE_URL`
  - Example: `postgresql://postgres:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=20`
- Copy **Direct Connection URL** -> Set as `DIRECT_URL`
  - Example: `postgresql://postgres:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require`

---

## STEP 2: Provision Managed Redis Instance

### 2.1 Website / Portal
- **Upstash Redis**: https://upstash.com/
- **Redis Cloud**: https://redis.io/cloud/
- **AWS ElastiCache**: https://aws.amazon.com/elasticache/

### 2.2 Actions to Perform
1. Log into portal and click **Create Database**.
2. Select **Redis 7+**.
3. Enable **TLS / Encryption in Transit** (mandatory for production security).
4. Set eviction policy to `volatile-lru` or `noeviction`.

### 2.3 Credentials to Copy & Environment Variable Mapping
- Copy **TLS Connection String (`rediss://`)** -> Set as `REDIS_URL`
  - Example: `rediss://default:<password>@your-endpoint.upstash.io:6379`

---

## STEP 3: Register Cashfree Production Merchant Account

### 3.1 Website / Portal
- **Cashfree Merchant Portal**: https://merchant.cashfree.com/

### 3.2 Actions to Perform
1. Log into Cashfree Merchant Dashboard.
2. Complete **Business Verification & KYC** (PAN, GST, Bank Account details).
3. Once approved, switch environment toggle at top-left from **Sandbox** to **Production**.
4. Navigate to **Developers -> API Keys**.
5. Click **Generate Production API Keys**.
6. Copy `App ID` and `Secret Key`.
7. Navigate to **Developers -> Webhooks**.
8. Click **Add Webhook Endpoint**:
   - Webhook URL: `https://api.yourtemple.org/api/v1/payments/webhook`
   - Select events: `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `USER_DROPPED`, `REFUND_STATUS`
9. Copy **Webhook Signing Secret**.

### 3.3 Environment Variable Mapping
- Set `CASHFREE_APP_ID` = Production App ID
- Set `CASHFREE_SECRET_KEY` = Production Secret Key
- Set `CASHFREE_WEBHOOK_SECRET` = Production Webhook Signing Secret
- Set `CASHFREE_ENVIRONMENT` = `production`

---

## STEP 4: Register MSG91 Production SMS & India TRAI DLT

### 4.1 Website / Portal
- **MSG91 Portal**: https://msg91.com/
- **India DLT Portals**: Jio DLT (https://trueconnect.jio.com/), Airtel DLT (https://dltconnect.airtel.in/), or Vilpower DLT.

### 4.2 Actions to Perform (India DLT Mandate)
1. Register Enterprise Entity on an Indian DLT Portal (Jio/Airtel/Vilpower).
2. Apply for Sender ID / Header (e.g. `TEMPLE`).
3. Create Content Template for OTP:
   - Template: `{#var#} is your OTP for Temple Digital Platform. Valid for 5 minutes.`
4. Once DLT Template is approved, log into **MSG91 Dashboard**.
5. Navigate to **SMS -> DLT Details** and add your approved DLT Entity ID and Template ID.
6. Navigate to **OTP -> Settings** and copy your `AuthKey`.

### 4.3 Environment Variable Mapping
- Set `SMS_PROVIDER` = `msg91`
- Set `MSG91_AUTH_KEY` = Production MSG91 AuthKey
- Set `MSG91_SENDER_ID` = Approved DLT Sender ID (e.g., `TEMPLE`)
- Set `MSG91_DLT_TE_ID` = Approved DLT Template ID

---

## STEP 5: Provision Object Storage (AWS S3 / Cloudflare R2 / Cloudinary)

### 5.1 Website / Portal
- **Cloudflare R2**: https://dash.cloudflare.com/ (No egress fees)
- **AWS S3**: https://s3.console.aws.amazon.com/
- **Cloudinary**: https://cloudinary.com/

### 5.2 Actions to Perform (Cloudflare R2 Example)
1. Log into Cloudflare Dashboard -> Navigate to **R2 Storage**.
2. Click **Create Bucket** -> Name: `temple-production-assets`.
3. Set Bucket CORS Policy to allow your domain `https://temple.example.com`.
4. Click **Manage R2 API Tokens** -> **Create API Token** with Edit permissions.

### 5.3 Environment Variable Mapping
- Set `STORAGE_PROVIDER` = `s3`
- Set `S3_BUCKET_NAME` = `temple-production-assets`
- Set `S3_ENDPOINT` = `https://<account_id>.r2.cloudflarestorage.com`

---

## STEP 6: Generate Secure Application Secrets

Run the following shell commands locally to generate cryptographically strong 256-bit secrets:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET
openssl rand -base64 32
```

---

## STEP 7: Configure Hosting Provider & Inject Secrets

### 7.1 Website / Portal
- **Render**: https://dashboard.render.com/
- **Railway**: https://railway.app/
- **AWS App Runner**: https://console.aws.amazon.com/apprunner/

### 7.2 Actions to Perform
1. Create a new **Web Service** pointing to your repository `~/Documents/temple_project`.
2. Environment: **Node**
3. Build Command: `npm install && npm run build`
4. Pre-Deploy Migration Command: `npx prisma migrate deploy`
5. Start Command: `npm run start:prod`
6. Navigate to **Environment Variables** tab in your hosting dashboard.
7. Paste all environment variables listed in Section 4 of [docs/EXTERNAL_ACCOUNTS_SETUP.md](file:///home/josh/Documents/temple_project/docs/EXTERNAL_ACCOUNTS_SETUP.md).

---

## STEP 8: Configure Custom Domain & HTTPS

1. In your domain registrar (Namecheap, GoDaddy, Cloudflare DNS), add DNS Record:
   - Type: `CNAME`
   - Host: `api`
   - Target: `your-hosting-app.onrender.com`
2. Enable Automatic SSL / TLS Certificate in hosting dashboard.
3. Confirm API is accessible via HTTPS: `https://api.yourtemple.org/api/v1/health/live`.

---

## STEP 9: Execute Live Production Manual Verification

After environment variables and domain are configured:

1. **Verify Health Probes**:
   ```bash
   curl -i https://api.yourtemple.org/api/v1/health/ready
   # Must return HTTP 200 OK with {"status":"ok","database":true,"redis":true}
   ```

2. **Verify Live OTP Delivery**:
   ```bash
   curl -X POST https://api.yourtemple.org/api/v1/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone":"+919876543210"}'
   # Verify physical SMS received on phone. Confirm response does NOT contain OTP.
   ```

3. **Verify Live Cashfree Payment Session**:
   - Create a booking via app/web client.
   - Proceed to payment screen and confirm Cashfree checkout loads live INR payment options (UPI, Netbanking, Cards).
   - Complete a ₹1 test payment.
   - Verify webhook triggers status update to `COMPLETED` in PostgreSQL database.

4. **Verify Storage Upload**:
   - Upload a photo via Admin/Staff dashboard.
   - Verify file successfully saves to object storage bucket and resolves public URL.

---

## STEP 10: Final Go-Live Sign-Off

Once all manual verifications in Step 9 pass cleanly, update the Go-Live Checklist status in [docs/GO_LIVE_CHECKLIST.md](file:///home/josh/Documents/temple_project/docs/GO_LIVE_CHECKLIST.md) to **🟢 GO**.
