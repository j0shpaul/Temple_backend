# 🛕 Temple Digital Platform Backend

> A production-ready, modular monolithic backend for managing end-to-end temple operations, devotee services, rituals, accommodations, donations, prasad offerings, crowd management, entry QR check-ins, and administrative dashboards.

Built with **NestJS**, **Prisma ORM**, **PostgreSQL**, **Redis**, and **Razorpay**.

---

## 🌟 Key Features

### 1. Devotee & Public Portal
- **Authentication**: Passwordless phone OTP login with JWT access/refresh token pair.
- **Temple Discovery**: Rich temple metadata, deities, histories, and photo galleries.
- **Darshan Booking**: Real-time slot availability, instant confirmation, and digital passes.
- **Aarti Schedules**: Daily schedules, special festive overrides, and today's timings.
- **Puja & Seva Services**: Browse ceremonies, choose deity, select slots with devotee and attendee details.
- **Accommodation**: Room listings, date-range availability checks, check-in/out management.
- **Prasad Ordering**: Catalog browsing, multi-item cart, order tracking, and stock-aware reservations.
- **Donations**: Support specific temple causes (Annadanam, Temple Renovation, Goshala), instant 80G tax receipts.
- **Events & Festivals**: Browse upcoming utsavs and register with digital event passes.
- **Notifications**: In-app notifications and broadcast announcements.

### 2. Admin & Staff Operations
- **Role-Based Access Control (RBAC)**: `DEVOTEE`, `STAFF`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`.
- **QR Code Check-In**: High-speed scanning for Darshan/Puja bookings, accommodation guests, and event attendees.
- **Real-Time Crowd Management**: Dynamic crowd level calculation (`LOW`, `MODERATE`, `HIGH`, `VERY_HIGH`), historical snapshots, and occupancy forecasting.
- **Financial Dashboard**: Real-time revenue analytics broken down by Bookings, Donations, Prasad, and Accommodation.
- **User & Role Management**: Staff invitation, role elevation, suspension, and devotee directory.
- **Audit Logging**: Comprehensive traceability for administrative actions.

---

## 🏗️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (TypeScript strict mode)
- **Database**: [PostgreSQL 15+](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Cache & In-Memory Store**: [Redis 7+](https://redis.io/)
- **Payment Gateway**: [Razorpay](https://razorpay.com/)
- **Documentation**: Swagger / OpenAPI 3.0
- **Testing**: Jest, Supertest (157 Unit Tests & 35 E2E Tests)
- **Containerization**: Multi-stage Dockerfile (Node 20/24 compatible)

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js >= 20.x
- PostgreSQL 15+
- Redis 7+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/temple_project.git
cd temple_project

# Install dependencies
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```
Configure your database and redis connection strings in `.env`:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/temple?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-minimum-32-chars"
CORS_ORIGINS="*"
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
```

### 4. Database Setup & Migrations
```bash
# Apply migrations safely
npx prisma migrate deploy

# Generate Prisma client
npm run prisma:generate

# (Optional) Seed initial sample temple data
npm run seed
```

### 5. Running the Application
```bash
# Development mode (hot reload)
npm run dev

# Production build & start
npm run build
npm run start:prod
```

---

## 🌐 Public Free Cloud Hosting Guide (For Client & Sir Testing)

You can host the entire platform for **100% free** without purchasing any domain.

### Architecture
```
Frontend (Vercel / Netlify / Local)
       ↓
Public HTTPS Backend (Render Free Web Service)
       ↓
PostgreSQL Database (Supabase Free Cloud Postgres)
       ↓
Redis Cache (Upstash Free Serverless Redis)
```

---

### Step 1: Create Free PostgreSQL on Supabase (2 minutes)
1. Sign up on [Supabase](https://supabase.com).
2. Click **New Project** → set database password.
3. Go to **Project Settings** → **Database**.
4. Copy the **Connection String** (URI format with Pooler on port 6543 or Direct on port 5432):
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

---

### Step 2: Create Free Redis on Upstash (1 minute)
1. Sign up on [Upstash](https://upstash.com).
2. Click **Create Database** (Redis) → select free region.
3. Copy the **Node.js ioredis connection string** (`rediss://...` with TLS):
   ```
   rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
   ```

---

### Step 3: Deploy Backend on Render (3 minutes)
1. Push this repository to your GitHub account.
2. Sign up on [Render](https://render.com).
3. Click **New +** → **Web Service** → Connect your GitHub repository.
4. Select **Node** environment.
5. Configure:
   - **Build Command**: `npm install && npm run build && npx prisma migrate deploy`
   - **Start Command**: `npm run start:prod`
   - **Instance Type**: `Free`
6. Add the following **Environment Variables** in Render's dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `API_PREFIX`: `api/v1`
   - `CORS_ORIGINS`: `*`
   - `DATABASE_URL`: `[YOUR SUPABASE URL FROM STEP 1]`
   - `REDIS_URL`: `[YOUR UPSTASH URL FROM STEP 2]`
   - `JWT_SECRET`: `[RANDOM 32+ CHARACTER STRING]`
   - `JWT_REFRESH_SECRET`: `[RANDOM 32+ CHARACTER STRING]`
   - `RAZORPAY_KEY_ID`: `rzp_test_...`
   - `RAZORPAY_KEY_SECRET`: `...`
7. Click **Create Web Service**.

Your backend will be live at:
- **Public URL**: `https://temple-backend-xxxx.onrender.com`
- **Swagger Docs**: `https://temple-backend-xxxx.onrender.com/docs`
- **Health Check**: `https://temple-backend-xxxx.onrender.com/api/v1/health`
- **Readiness Check**: `https://temple-backend-xxxx.onrender.com/api/v1/health/ready`

---

## 🧪 Testing & Verification

### Run Unit Tests (157 tests across 9 suites)
```bash
npm run test
```

### Run End-to-End & Concurrency Tests (35 tests)
```bash
npm run test:e2e
```

---

## 📚 Developer Documentation

- **[Frontend Handoff Guide](docs/FRONTEND_HANDOFF.md)**: Request/response specs, Axios client example, authentication & booking flows.
- **[Full REST API Specification](docs/API.md)**: Exhaustive documentation for all 117 API routes across 19 tags.
- **[Detailed Deployment Manual](docs/DEPLOYMENT.md)**: Production VPS, Docker, PM2, and Nginx configurations.

---

## 🔧 Troubleshooting

1. **`CORS Error` on frontend**: Verify `CORS_ORIGINS=*` is set in the backend environment variables or includes the frontend's domain.
2. **`P1001 / Can't reach database server`**: In Supabase connection strings, ensure you replaced `[YOUR-PASSWORD]` with the actual database password and enabled the transaction pooler on port 6543.
3. **`Redis connection failed`**: Ensure your Upstash URL starts with `rediss://` for TLS encrypted connections.
4. **Render Free Tier Spin Down**: Free instances sleep after 15 minutes of inactivity; the initial wake-up request may take ~30-50 seconds.

---

## 📄 License
Private & Proprietary. All rights reserved.
