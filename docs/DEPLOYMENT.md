# Temple Digital Platform — Production & Free Test Hosting Deployment Guide

This guide provides step-by-step instructions to deploy the Temple Digital Platform backend on both production infrastructure and 100% free hosting tiers for testing and staging.

---

## Architecture Overview

- **Backend**: NestJS (Modular Monolith) with Fastify/Express engine
- **Database**: PostgreSQL 15+ (with Prisma ORM)
- **Cache & OTP Store**: Redis 7+
- **Payment Gateway**: Razorpay
- **Process Manager**: Docker / PM2 / Node.js 20+

---

## 1. Free Test Hosting Options (100% Free Tiers)

You can host the entire stack for free for development, testing, and client demos using the following cloud services:

### Option A: Railway.app (Recommended — Simplest Setup)

1. **Sign up**: Create an account on [Railway.app](https://railway.app).
2. **Create New Project**: Click **New Project** → **Provision PostgreSQL**.
3. **Provision Redis**: In the same project, click **New** → **Database** → **Add Redis**.
4. **Deploy Backend from GitHub**:
   - Click **New** → **GitHub Repo** → select `temple_project`.
5. **Set Environment Variables** in Railway Dashboard:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `REDIS_URL`: `${{Redis.REDIS_URL}}`
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `JWT_SECRET`: `<generate-32-char-random-string>`
   - `JWT_REFRESH_SECRET`: `<generate-32-char-random-string>`
   - `CORS_ORIGINS`: `*` (or your frontend domain)
   - `RAZORPAY_KEY_ID`: `rzp_test_...`
   - `RAZORPAY_KEY_SECRET`: `...`
6. **Build & Start Commands**:
   - Build Command: `npm run build && npx prisma migrate deploy`
   - Start Command: `npm run start:prod`

---

### Option B: Render.com (Free Tier) + Supabase (Postgres) + Upstash (Redis)

#### 1. Free PostgreSQL via Supabase
- Create a free project on [Supabase](https://supabase.com).
- Under **Settings → Database**, copy the **Transaction Connection Pooler URL** (port 6543) or direct connection string.
- Set this as `DATABASE_URL`.

#### 2. Free Serverless Redis via Upstash
- Create a free database on [Upstash](https://upstash.com).
- Copy the `redis://...` connection string.
- Set this as `REDIS_URL`.

#### 3. Web Service on Render
- Create a new **Web Service** on [Render.com](https://render.com).
- Connect your repository.
- Environment: `Node`.
- Build Command: `npm install && npm run build && npx prisma migrate deploy`
- Start Command: `npm run start:prod`
- Set the environment variables in Render's **Environment** tab.

---

## 2. Self-Hosted VPS / Production Deployment (Ubuntu 22.04 LTS)

### Prerequisites

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS & npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Docker & Docker Compose (Optional for containerized DB/Redis)
sudo apt install -y docker.io docker-compose-v2
```

---

### Step 1: Clone Repository and Install Dependencies

```bash
cd /var/www
git clone https://github.com/your-org/temple_project.git temple-backend
cd temple-backend

npm ci --production=false
```

---

### Step 2: Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Ensure the following production values are configured:

```ini
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database
DATABASE_URL="postgresql://temple_user:StrongPassword123@localhost:5432/temple?schema=public&connection_limit=20"

# Redis
REDIS_URL="redis://:RedisPassword123@localhost:6379"

# JWT Security (Generate with: openssl rand -base64 32)
JWT_SECRET="YOUR_LONG_RANDOM_SECRET_KEY_MIN_32_CHARS"
JWT_REFRESH_SECRET="YOUR_LONG_RANDOM_REFRESH_SECRET_MIN_32_CHARS"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# CORS (Comma separated allowed domains)
CORS_ORIGINS="https://temple.yourdomain.com,https://admin.yourdomain.com"

# Payment Gateway (Razorpay Live or Test)
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
```

---

### Step 3: Run Database Migrations & Build

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Build TypeScript to dist/
npm run build
```

---

### Step 4: Run with PM2 Process Manager

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "temple-backend",
      script: "dist/main.js",
      instances: "max",
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "500M",
      error_file: "./logs/pm2-err.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
```

Start the application:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

### Step 5: Configure Nginx Reverse Proxy with HTTPS

Create `/etc/nginx/sites-available/temple-backend`:

```nginx
server {
    server_name api.temple.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

Enable site and acquire SSL:

```bash
sudo ln -s /etc/nginx/sites-available/temple-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Free SSL Certificate via Let's Encrypt
sudo certbot --nginx -d api.temple.yourdomain.com
```

---

## 3. Health & Monitoring Probes

| Probe Endpoint | Purpose | Expected Status |
|---|---|---|
| `GET /api/v1/health` | Liveness check (checks if process is running) | `{"status": "ok"}` (HTTP 200) |
| `GET /api/v1/health/ready` | Readiness check (checks DB & Redis connection) | `{"status": "ok", "info": {"database": {"status": "up"}, "redis": {"status": "up"}}}` |

---

## 4. Backup & Maintenance

### Daily Automated Database Backup

Add to crontab (`crontab -e`):

```bash
0 2 * * * pg_dump -U temple_user -d temple | gzip > /backups/temple_$(date +\%Y\%m\%d).sql.gz
```
