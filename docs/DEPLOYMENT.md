# Temple Digital Platform — Production Deployment Guide

This guide provides end-to-end instructions to deploy the Temple Digital Platform backend in a production environment with horizontal scaling, managed PostgreSQL, managed Redis, S3/Cloudinary object storage, and Cashfree payments.

---

## 1. Production Architecture Overview

```text
                           Internet / Devotees & Admins
                                      │
                                      ▼
                            Cloudflare / AWS ALB
                        (SSL/TLS, DDoS, WAF, Rate Limit)
                                      │
                        ┌─────────────┼─────────────┐
                        ▼             ▼             ▼
                   NestJS API 1  NestJS API 2  NestJS API 3
                   (Instances behind PM2 / Container Pods)
                        │             │             │
                        └─────────────┼─────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
     Managed PostgreSQL 16+                        Managed Redis 7+
(Supabase, Neon, AWS RDS, GCP Cloud SQL)      (Upstash, Redis Cloud, ElastiCache)
  ├── Automated Daily Snapshots                 ├── Distributed Sliding Rate Limits
  ├── Point-in-Time Recovery (WAL)              ├── Session Revocation & OTP Stores
  └── PgBouncer Connection Pooling              └── Page-level Aggregation BFF Caches
                 │
                 ▼
     Offsite Cloud Backup Bucket
    (AWS S3 / Cloudflare R2 Archive)
```

---

## 2. Infrastructure Requirements

### A. Managed PostgreSQL 16+
- **Recommended Providers**: Supabase, Neon, AWS RDS PostgreSQL, Google Cloud SQL.
- **Connection Mode**: Use Transaction Pooler (PgBouncer) for multi-instance deployments.
- **Database URL Format**:
  `postgresql://user:password@pooler.host:6543/postgres?sslmode=require&connection_limit=20`

### B. Managed Redis 7+
- **Recommended Providers**: Upstash Redis (Serverless TLS), Redis Cloud, AWS ElastiCache.
- **Redis URL Format**:
  `rediss://default:password@endpoint.upstash.io:6379`

### C. S3-Compatible Object Storage
- **Recommended Providers**: AWS S3, Cloudflare R2, or Cloudinary.
- **Purpose**: Direct client pre-signed uploads for media, avoiding server-side file proxying.

### D. Cashfree Payment Gateway
- **Production Merchant Dashboard**: https://merchant.cashfree.com/
- **Credentials**: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET`.

---

## 3. Step-by-Step Deployment Procedure

### Step 1: Clone Repository & Install Production Dependencies
```bash
git clone https://github.com/your-org/temple_project.git temple-backend
cd temple-backend

# Install exact locked dependencies
npm ci --production=false
```

### Step 2: Configure Production Environment (`.env`)
```bash
cp .env.example .env
nano .env
```
Ensure all required environment variables are set:
```ini
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
ENABLE_SWAGGER=false

# Allowed production origins (NO wildcard in production)
CORS_ORIGINS=https://temple.example.com,https://admin.temple.example.com

# Managed Databases
DATABASE_URL=postgresql://user:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=20
REDIS_URL=rediss://default:password@your-endpoint.upstash.io:6379

# Cryptographically random secrets (openssl rand -base64 32)
JWT_SECRET=super_secret_jwt_key_at_least_32_chars_long
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_at_least_32_chars_long
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=30d

# Cashfree Production Credentials
CASHFREE_APP_ID=your_cashfree_production_app_id
CASHFREE_SECRET_KEY=your_cashfree_production_secret_key
CASHFREE_WEBHOOK_SECRET=your_cashfree_webhook_signing_secret
CASHFREE_ENVIRONMENT=production

# Object Storage for Direct Presigned Uploads
S3_BUCKET_NAME=temple-production-assets
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

# Background Scheduler & Logging
CLEANUP_INTERVAL_MS=300000
LOG_LEVEL=info
```

### Step 3: Run Database Migrations & Compile
```bash
# Apply pending migrations safely
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Build TypeScript to dist/ via SWC
npm run build
```

### Step 4: Run with PM2 Cluster Manager (Multi-Core Horizontal Scale)
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: "temple-backend",
      script: "dist/main.js",
      instances: "max", // Scales to all available CPU cores
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "600M",
      error_file: "./logs/pm2-err.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
```
Start PM2:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 4. Reverse Proxy & HTTPS Configuration (Nginx)

Create `/etc/nginx/sites-available/temple-backend`:
```nginx
server {
    server_name api.temple.example.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```
Acquire SSL Certificate via Certbot:
```bash
sudo certbot --nginx -d api.temple.example.com
```

---

## 5. Health Probes & Load Balancer Checks

| Endpoint | Probe Type | Purpose | Healthy Response |
|---|---|---|---|
| `GET /api/v1/health/live` | **Liveness** | Verifies process is alive | `{"status": "ok", "info": {"app": {"status": "up"}}}` |
| `GET /api/v1/health/ready` | **Readiness** | Verifies DB & Redis are connected | `{"status": "ok", "info": {"database": {"status": "up"}, "redis": {"status": "up"}}}` |
| `GET /api/v1/health` | **Full Health** | Aggregated system health | `{"status": "ok", "info": { ... }}` |

---

## 6. Automated Backup Setup

Add backup script to cron (`crontab -e`):
```bash
# Run backup daily at 02:00 AM UTC
0 2 * * * /var/www/temple-backend/scripts/backup.sh /var/backups/temple >> /var/log/temple_backup.log 2>&1
```
