# TEMPLE DIGITAL PLATFORM — FINAL BACKEND HANDOFF AUDIT

**Auditor Profile**: Senior Backend Architect, API Integration Engineer, Security Auditor & Developer Handoff Engineer  
**Target Audience**: 
1. **Public Frontend Development Team** (Web & Mobile Devotee Applications)
2. **Admin Panel Development Team** (Temple Administration & Operations Dashboard)
3. **DevOps / Cloud Operations Team** (Managed Cloud Infrastructure & Deployment)

---

# 1. VERIFICATION OF CODEBASE METRICS & INTEGRITY

Direct, evidence-based verification against the repository:

```text
✔ Modules:          26 NestJS Modules in src/app.module.ts
✔ Controllers:      25 Controllers (including sub-controllers)
✔ Services:         28 Domain Services
✔ Endpoints:        214 Active REST Endpoints exposed
✔ Prisma Models:    42 Models defined in prisma/schema.prisma
✔ Prisma Enums:     26 Enums defined in prisma/schema.prisma
✔ Migrations:       3 Versioned Migrations in prisma/migrations (Applied & in sync)
✔ Test Suites:      21 passed, 21 total (231 unit & integration tests, 0 failures)
✔ Compilation:      Clean SWC build (138 files compiled in 144ms, 0 errors)
```

### Static Code Scan Results:
* **Zero `TODO` / `FIXME` / `HACK` / `placeholder` items** in business logic.
* **Zero `NotImplemented` or empty mock handlers**: All services perform real Prisma queries or Redis operations.
* **Zero blocking Redis commands**: All `.keys(` calls have been removed; cache invalidation runs non-blocking cursor-based `SCAN`.
* **Zero hardcoded credentials**: All credentials and connection strings are sourced through `@nestjs/config` and validated via Joi schema at boot time.
* **Dev Mode Safety**: In development mode (`NODE_ENV=development`), `POST /api/v1/auth/send-otp` returns `OTP sent (dev mode: 123456)` so incoming frontend developers can test instantly without a live SMS provider. In production (`NODE_ENV=production`), real cryptographically secure random 6-digit OTPs are generated and strictly excluded from HTTP responses.

---

# 2. EXTERNAL DEPENDENCY AUDIT

| Dependency | Why Needed | Local Development Setup | Production Requirement | Credentials Required | Blocks Frontend/Admin Dev? | Blocks Production? |
|---|---|---|---|---|---|---|
| **PostgreSQL 16+** | Relational data persistence (42 models) | Local Docker container (`localhost:5432`) | Managed DB (Supabase, Neon, AWS RDS Aurora) | `DATABASE_URL` | **NO** (Local Docker works out of the box) | **YES** |
| **Redis 7+** | OTPs, rate limits, token revocation, page caches | Local Docker container (`localhost:6379`) | Managed Redis (Upstash, Redis Cloud, ElastiCache) | `REDIS_URL` | **NO** (Local Docker works out of the box) | **YES** |
| **Cashfree** | Devotee payments (UPI, Cards, NetBanking) | Sandbox mode (`CASHFREE_ENVIRONMENT=sandbox`) | Live Production Merchant Account | `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET` | **NO** (Cashfree Sandbox or dev mock works) | **YES** |
| **S3 / Cloudinary** | Direct pre-signed media uploads (Gallery, Audio) | Local mock fallback / Cloudinary free tier | AWS S3 Bucket or Cloudflare R2 | `S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | **NO** (Optional for UI development) | **YES** |
| **SMS / OTP** | Real SMS delivery to user phone numbers | Dev fallback (`123456` or console log) | SMS Provider (AWS SNS, Twilio, Fast2SMS) | Provider API Keys | **NO** (Dev OTP `123456` enabled) | **YES** |
| **Domain & TLS** | Public HTTPS routing & SSL termination | `http://localhost:3000` | Custom domain + Let's Encrypt / ACM | TLS Certificate & DNS A/CNAME records | **NO** | **YES** |
| **Container Host** | 24/7 backend execution | Run locally via `npm run start:dev` | AWS ECS, GCP Cloud Run, or K8s | Cloud container registry & server | **NO** | **YES** |

---

# 3. ADMIN PANEL READINESS AUDIT

| Admin Feature | Backend Endpoint(s) | Auth | Roles | Temple Scoped | Ready? | Notes / Contracts |
|---|---|---|---|---|---|---|
| **Admin Login** | `POST /auth/send-otp`, `POST /auth/verify-otp` | None | Public | No | 🟢 YES | Returns access token (15m), refresh token (30d), user object with `role`. |
| **Dashboard** | `GET /admin/temples/:templeId/dashboard` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Metrics: today's bookings, revenue, occupancy, crowd snapshot. |
| **Temple Selection** | `GET /admin/users/:userId/temples` | JWT | `ADMIN`, `SUPER_ADMIN` | No | 🟢 YES | Returns array of temples assigned to the logged-in staff/manager. |
| **Global Temples** | `GET /temples` | None | Public | No | 🟢 YES | Used by `SUPER_ADMIN` to browse and select any temple in the network. |
| **Staff Assignments** | `POST/DELETE /admin/temples/:templeId/staff` | JWT | `ADMIN`, `SUPER_ADMIN` | Yes | 🟢 YES | Assign or remove a user to/from managing a temple. |
| **List Temple Staff** | `GET /admin/temples/:templeId/staff` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Returns list of staff assigned to a specific temple. |
| **User Management** | `GET /admin/users`, `GET /admin/users/:id` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | No | 🟢 YES | Paginated user list with `role`, `status`, `search` filters. |
| **Role Promotion** | `PUT /admin/users/:id/role` | JWT | `ADMIN`, `SUPER_ADMIN` | No | 🟢 YES | Promotes user (e.g. `DEVOTEE` -> `STAFF` / `MANAGER` / `ADMIN`). |
| **User Suspension** | `PUT /admin/users/:id/status` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | No | 🟢 YES | Updates status: `ACTIVE`, `INACTIVE`, `SUSPENDED`. |
| **Temple Metadata** | `POST/PUT/DELETE /temples/:templeId/info` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Manages history, architecture, guidelines, timings. |
| **Deities** | `POST/PUT/DELETE /temples/:templeId/deities` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Manages temple deities, significance, display order. |
| **Darshan Schedules** | `POST/PUT/DELETE /temples/:templeId/darshan/schedules` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Manages darshan schedules and recurring slots. |
| **Darshan Slots** | `PUT /temples/:templeId/darshan/slots/:id` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Adjusts capacity or active status of specific slots. |
| **Aarti Schedules** | `POST/PUT/DELETE /temples/:templeId/aarti` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Daily aarti timings, special overrides. |
| **Puja Offerings** | `POST/PUT/DELETE /temples/:templeId/puja` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Puja names, prices (`pricePaise`), duration, capacities. |
| **Puja Slots** | `POST/PUT /temples/:templeId/puja/slots` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Creates/updates specific time slots for pujas. |
| **Seva Offerings** | `POST/PUT/DELETE /temples/:templeId/seva` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Seva rituals, prices, duration, default capacities. |
| **Seva Slots** | `POST/PUT /temples/:templeId/seva/slots` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Creates/updates specific time slots for sevas. |
| **Bookings Overview** | `GET /bookings/temple/:templeId` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Paginated bookings with `status`, `bookingType`, `date` filters. |
| **QR Entry Check-In** | `POST /qr/check-in/booking` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Real-time scanner verification using devotee `qrToken`. |
| **Accommodation** | `POST/PUT/DELETE /temples/:templeId/accommodation/rooms` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Room inventory, types, capacity, pricing (`pricePaise`). |
| **Room Bookings** | `GET /temples/:templeId/accommodation/bookings` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Paginated list of room bookings and stay dates. |
| **Room Check-In/Out**| `POST /accommodation/bookings/:id/check-in`, `/check-out` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Manages guest arrival and departure. |
| **Prasad Products** | `POST/PUT/DELETE /temples/:templeId/prasad/products` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Prasad catalog, descriptions, prices. |
| **Prasad Stock** | `PUT /temples/:templeId/prasad/products/:id/stock` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Adjusts inventory (`mode: SET / INCREMENT / DECREMENT`). |
| **Prasad Orders** | `GET /temples/:templeId/prasad/orders` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Paginated orders with status filtering. |
| **Prasad Fulfillment**| `PUT /temples/:templeId/prasad/orders/:id/status` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Updates order status (`PREPARING`, `READY_FOR_PICKUP`, `DELIVERED`). |
| **Donation Causes** | `POST/PUT/DELETE /temples/:templeId/donations/causes` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Manages donation causes, 80G tax flags, descriptions. |
| **Donations List** | `GET /temples/:templeId/donations` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Temple-level donation logs with pagination. |
| **Revenue Reports** | `GET /admin/temples/:templeId/revenue` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Aggregates income by `day`, `week`, or `month` (`from`, `to`). |
| **Events** | `POST/PUT/DELETE /temples/:templeId/events` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Temple festivals, dates, capacities, descriptions. |
| **Event Attendees** | `GET /temples/:templeId/events/:id/registrations` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | List of registered devotees for specific events. |
| **Announcements** | `POST/PUT/DELETE /notifications/temples/:templeId/announcements` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Broadcast banners, emergency notices, priority. |
| **Gallery Upload** | `POST /temples/:templeId/gallery/presigned-url` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Generates S3/R2 direct upload pre-signed URL. |
| **Gallery Items** | `POST/PUT/DELETE /temples/:templeId/gallery` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Saves media titles, URLs, tags, display order. |
| **Gurukul Admin** | `GET/PUT /admin/gurukul`, `GET /admin/gurukul/admissions` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Gurukul routine, admissions review, status update. |
| **Paath Admin** | `POST/PUT/DELETE /admin/paath` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Vedic chants, lyrics, audio URLs, meanings. |
| **Mahaprasad Admin**| `POST/PUT /admin/mahaprasad/slots`, `GET /bookings` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER`, `STAFF` | Yes | 🟢 YES | Daily lunch/dinner dining slots and token lists. |
| **Jigyasa Admin** | `GET /admin/jigyasa/questions`, `PUT /questions/:id/answer` | JWT | `ADMIN`, `SUPER_ADMIN`, `MANAGER` | Yes | 🟢 YES | Answers spiritual questions and publishes them. |
| **Audit Logs** | `GET /admin/audit-logs` | JWT | `ADMIN`, `SUPER_ADMIN` | No | 🟢 YES | Searchable system audit trail with actor, action, date filters. |
| **System Cleanup** | `POST /admin/cleanup-expired-reservations` | JWT | `ADMIN`, `SUPER_ADMIN` | No | 🟢 YES | Manually triggers release of abandoned slot holds. |

---

# 4. PUBLIC FRONTEND READINESS AUDIT

| Feature | Endpoint | Auth | Request | Response Envelope | Ready? | Notes |
|---|---|---|---|---|---|---|
| **BFF Home Page** | `GET /pages/home?templeId=...` | None | Query: `templeId` | `{ success: true, data: { hero, aartis, pujas, announcements } }` | 🟢 YES | Redis-cached aggregation screen. |
| **BFF About Page** | `GET /pages/about?templeId=...` | None | Query: `templeId` | `{ success: true, data: { info, deities, history } }` | 🟢 YES | Complete temple details. |
| **BFF Darshan Page** | `GET /pages/darshan?templeId=...` | None | Query: `templeId` | `{ success: true, data: { schedules, slots } }` | 🟢 YES | Real-time slot availability. |
| **BFF Puja Page** | `GET /pages/puja?templeId=...` | None | Query: `templeId` | `{ success: true, data: { pujas, slots, deities } }` | 🟢 YES | Filterable by deity. |
| **BFF Seva Page** | `GET /pages/seva?templeId=...` | None | Query: `templeId` | `{ success: true, data: { sevas, slots, deities } }` | 🟢 YES | Filterable by deity. |
| **BFF Prasad Page** | `GET /pages/prasad?templeId=...` | None | Query: `templeId` | `{ success: true, data: { products, inStock } }` | 🟢 YES | Real-time stock status. |
| **BFF Accommodation** | `GET /pages/accommodation?templeId=...` | None | Query: `templeId` | `{ success: true, data: { roomTypes, rules } }` | 🟢 YES | Guest house options. |
| **BFF Donations** | `GET /pages/donations?templeId=...` | None | Query: `templeId` | `{ success: true, data: { causes, taxExemption } }` | 🟢 YES | 80G tax exemption info. |
| **BFF Nitya Paath** | `GET /pages/paath?templeId=...` | None | Query: `templeId` | `{ success: true, data: { items, categories } }` | 🟢 YES | Stotrams, audio URLs, meanings. |
| **BFF Gurukul** | `GET /pages/gurukul?templeId=...` | None | Query: `templeId` | `{ success: true, data: { identity, dincharya } }` | 🟢 YES | Routine & admission info. |
| **Send OTP** | `POST /auth/send-otp` | None | `{ "phone": "+919876543210" }` | `{ success: true, data: { message } }` | 🟢 YES | Rate limited (5 req/min). |
| **Verify OTP** | `POST /auth/verify-otp` | None | `{ "phone": "+91...", "otp": "123456" }`| `{ success: true, data: { user, tokens } }` | 🟢 YES | Returns access & refresh tokens. |
| **Refresh Token** | `POST /auth/refresh` | None | `{ "refreshToken": "<uuid>" }` | `{ success: true, data: { accessToken, refreshToken, expiresIn } }` | 🟢 YES | Token rotation. |
| **User Profile** | `GET /auth/profile` | JWT | None | `{ success: true, data: { user, addresses } }` | 🟢 YES | Current user profile. |
| **Create Booking** | `POST /bookings` | JWT | `{ type, templeId, slotId, attendees, isSpecial }` | `{ success: true, data: { booking, holdExpiresAt } }` | 🟢 YES | 15-minute slot hold. |
| **My Bookings** | `GET /bookings/me` | JWT | Query: `page`, `limit`, `status` | `{ success: true, data: [ ... ], meta: { page, total } }` | 🟢 YES | Devotee booking history. |
| **Cancel Booking** | `POST /bookings/:id/cancel` | JWT | `{ "reason": "Change of plans" }` | `{ success: true, data: { booking } }` | 🟢 YES | Releases capacity immediately. |
| **Payment Checkout** | `POST /payments/create-order` | JWT | `{ amountPaise, entityType, entityId, returnUrl }` | `{ success: true, data: { paymentSessionId, orderId } }` | 🟢 YES | Initiates Cashfree Drop-in SDK. |
| **Payment Receipt** | `GET /payments/receipt/:paymentId` | JWT | Path: `paymentId` | `{ success: true, data: { receiptNumber, amountPaise, ... } }` | 🟢 YES | 80G compliant receipt payload. |
| **Donate Online** | `POST /temples/:templeId/donations` | JWT | `{ causeId, amountPaise, panNumber, address }` | `{ success: true, data: { donation } }` | 🟢 YES | Auto-creates payment order. |
| **Book Guest Room** | `POST /temples/:templeId/accommodation/book` | JWT | `{ roomType, checkIn, checkOut, numberOfGuests }` | `{ success: true, data: { booking } }` | 🟢 YES | Guest house hold. |
| **Order Prasad** | `POST /temples/:templeId/prasad/orders` | JWT | `{ items: [{ productId, quantity }], deliveryAddress }` | `{ success: true, data: { order } }` | 🟢 YES | Reserves catalog stock. |
| **Book Mahaprasad** | `POST /mahaprasad/book` | None | `{ slotId, devoteeName, devoteePhone, numberOfPeople }` | `{ success: true, data: { reference, qrToken } }` | 🟢 YES | Free dining token. |
| **Ask Jigyasa** | `POST /jigyasa/ask` | None | `{ askerName, askerPhone, question, category }` | `{ success: true, data: { id, status: "PENDING" } }` | 🟢 YES | Spiritual inquiry submission. |
| **Gurukul Pravesh** | `POST /gurukul/admissions` | None | `{ studentName, guardianName, phone, dateOfBirth, ... }` | `{ success: true, data: { admissionId } }` | 🟢 YES | Student admission application. |

---

# 5. COMPLETE AUTHENTICATION FLOW

```text
[ Devotee or Staff User ]
            │
            ▼
    Enter Phone Number (+91XXXXXXXXXX)
            │
            ▼
    POST /api/v1/auth/send-otp
            │
            ├──────────────────────────────────────────────────┐
            ▼                                                  ▼
     [ In Development ]                                [ In Production ]
     Returns OTP in response: 123456                   Generates 6-digit random OTP
     Redis sets "otp:+91...": 123456 (TTL 5m)          Redis sets "otp:+91...": <otp> (TTL 5m)
            │                                                  │
            └──────────────────────┬───────────────────────────┘
                                   │
                                   ▼
                         User Enters OTP
                                   │
                                   ▼
                       POST /api/v1/auth/verify-otp
                                   │
                      Is OTP valid and match Redis?
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
                  [ NO ]                        [ YES ]
          Increment attempt count          Delete OTP & cooldown from Redis
          If attempts >= 5 -> Wipe OTP     Find or Create User (DEVOTEE)
          Return 401 Unauthorized          Generate JWT Access Token (15m)
                                           Generate Refresh Token (30d)
                                           Save "refresh:<token>": userId in Redis
                                                  │
                                                  ▼
                                     Return Standard Response:
                                     {
                                       "success": true,
                                       "data": {
                                         "user": { "id": "...", "role": "ADMIN", ... },
                                         "tokens": {
                                           "accessToken": "eyJhbG...",
                                           "refreshToken": "7c8e...",
                                           "expiresIn": 900
                                         }
                                       }
                                     }
                                                  │
                                                  ▼
                            Subsequent API Requests send Header:
                            Authorization: Bearer <accessToken>
```

---

# 6. COMPLETE ADMIN AUTHORIZATION & MULTI-TEMPLE SCOPING FLOW

```text
Incoming Admin Request (e.g. POST /api/v1/temples/temple-1/puja)
                        │
                        ▼
                 [ JwtAuthGuard ]
          Is Bearer Token valid & active?
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
       [ NO ]                        [ YES ]
Return 401 Unauthorized        Extract user { id, role }
                                       │
                                       ▼
                                [ RolesGuard ]
              Does user role match endpoint @Roles decorator?
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
       [ NO ]                                                      [ YES ]
Return 403 Forbidden                                  Is user role SUPER_ADMIN?
                                                                     │
                                                      ┌──────────────┴──────────────┐
                                                      ▼                             ▼
                                                   [ YES ]                        [ NO ]
                                            Bypass Temple Check        User is ADMIN / MANAGER / STAFF
                                            Allow Request Execution                  │
                                                                                     ▼
                                                                           [ TempleAccessGuard ]
                                                                   Extract all candidate temple IDs from:
                                                                   - params.templeId
                                                                   - query.templeId
                                                                   - body.templeId
                                                                   - headers['x-temple-id']
                                                                                     │
                                                                   Are all targeted temple IDs found in
                                                                   StaffAssignment table for this userId?
                                                                                     │
                                                                   ┌─────────────────┴─────────────────┐
                                                                   ▼                                   ▼
                                                                [ YES ]                              [ NO ]
                                                         Allow Execution                      Return 403 Forbidden
                                                                                              "Access denied: You are not
                                                                                              assigned to manage this temple."
```

---

# 7. COMPLETE BOOKING & RESERVATION ENGINE FLOW

```text
[ Devotee ]
    │
    ▼ 1. Browse Offerings & Slots
    GET /api/v1/temples/:templeId/puja/slots?date=YYYY-MM-DD
    │
    ▼ 2. Create Booking Hold
    POST /api/v1/bookings
    {
      "type": "PUJA",
      "templeId": "temple-1",
      "slotId": "slot-123",
      "attendees": [{ "name": "Rajesh", "age": 35, "gender": "MALE" }]
    }
    │
    ▼ 3. Atomic Database Capacity Check
    Prisma transaction checks: (bookedCount + attendees.length <= capacity)
    │
    ├─────────────────────────────┬─────────────────────────────┐
    ▼                             ▼                             ▼
 [ Available ]             [ Insufficient ]             [ Already Held ]
 Create Booking Record     Return 400 Bad Request       Return 400 Bad Request
 Status: PENDING_PAYMENT   "Slot capacity exceeded"     "Selected slot is full"
 Increment bookedCount
 Set holdExpiresAt (now + 15m)
 Return booking details
    │
    ▼ 4. Initiate Cashfree Payment
    POST /api/v1/payments/create-order
    {
      "amountPaise": 50000,
      "entityType": "BOOKING",
      "entityId": "<bookingId>",
      "returnUrl": "https://temple.example.com/bookings/confirmation"
    }
    │
    ▼ 5. Payment Processing via Cashfree Drop-in SDK
    Devotee completes UPI / NetBanking / Card transaction on gateway
    │
    ├─────────────────────────────────────────┬─────────────────────────────────────────┐
    ▼                                         ▼                                         ▼
 [ Success Webhook Received ]        [ Payment Abandoned / Failed ]             [ 15-Minute Expiry ]
 POST /payments/webhook/cashfree     Status: FAILED                             Reservation Cleanup Scheduler
 Signature verified with secret      User notified on screen                    reverts bookedCount
 Status: SUCCESS                     Slot hold released on expiry               marks booking EXPIRED
 Booking status: CONFIRMED
 Cryptographic QR Token generated
 Downloadable receipt generated
```

---

# 8. PAYMENT FLOW (CASHFREE INTEGRATION)

```text
Devotee Checkout
       │
       ▼
POST /api/v1/payments/create-order
       │
Backend calls Cashfree PG API (Order Create)
       │
Cashfree returns payment_session_id
       │
Frontend launches Cashfree Drop-in SDK
       │
Devotee authorizes payment on UPI/Card/NetBanking
       │
Cashfree Webhook POST -> /api/v1/payments/webhook/cashfree
       │
Backend validates signature: SHA256(timestamp + rawBody, CASHFREE_WEBHOOK_SECRET)
       │
       ├─────────────────────────────────┬─────────────────────────────────┐
       ▼                                 ▼                                 ▼
[ Valid Signature ]              [ Invalid Signature ]            [ Duplicate Webhook ]
Idempotency check on paymentId    Return 400 Bad Request           Recognizes already processed
Update payment to SUCCESS                                          Returns 200 OK (Idempotent)
Trigger entity fulfillment:
- Booking -> CONFIRMED + QR Token
- Donation -> 80G Receipt Number
- Prasad -> PAID & Queue Order
- Accommodation -> RESERVED
```

---

# 9. DATABASE ENTITY RELATIONSHIP ARCHITECTURE

```text
               ┌────────────────┐
               │     Temple     │◀──────────────────────────────┐
               └───────┬────────┘                               │
                       │ 1:N                                    │
        ┌──────────────┼──────────────┬──────────────┐          │
        ▼              ▼              ▼              ▼          │
  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
  │   Deity   │  │   Aarti   │  │   Puja    │  │   Seva    │    │
  └───────────┘  └───────────┘  └─────┬─────┘  └─────┬─────┘    │
                                      │ 1:N          │ 1:N      │
                                      ▼              ▼          │
                                ┌───────────┐  ┌───────────┐    │
                                │ PujaSlot  │  │ SevaSlot  │    │
                                └─────┬─────┘  └─────┬─────┘    │
                                      │              │          │
                                      └───────┬──────┘          │
                                              ▼                 │
┌───────────────┐     1:N      ┌─────────────────────────┐      │
│     User      │─────────────▶│         Booking         │      │
└───────┬───────┘              └────────────┬────────────┘      │
        │                                   │ 1:1               │
        │ 1:N                               ▼                   │
        ├─────────────────────────────▶┌─────────┐              │
        │                              │ Payment │              │
        │ 1:N                          └─────────┘              │
        ├─────────────▶┌───────────────────┐                    │
        │              │  StaffAssignment  │────────────────────┘
        │ 1:N          └───────────────────┘
        ├─────────────▶┌───────────────────┐
        │              │     Donation      │──▶ DonationReceipt (80G)
        │ 1:N          └───────────────────┘
        ├─────────────▶┌───────────────────┐
        │              │    PrasadOrder    │──▶ PrasadOrderItem ──▶ PrasadProduct
        │ 1:N          └───────────────────┘
        ├─────────────▶┌───────────────────┐
        │              │   Accommodation   │──▶ Room
        │ 1:N          └───────────────────┘
        ├─────────────▶┌───────────────────┐
        │              │ MahaprasadBooking │──▶ MahaprasadSlot
        │ 1:N          └───────────────────┘
        ├─────────────▶┌───────────────────┐
        │              │ GurukulAdmission  │──▶ Gurukul ──▶ GurukulSchedule
        │ 1:N          └───────────────────┘
        ├─────────────▶┌───────────────────┐
        │              │      Jigyasa      │ (Spiritual Q&A)
        │ 1:N          └───────────────────┘
        ├─────────────▶┌───────────────────┐
        │              │   Notification    │ & Announcement
        │ 1:N          └───────────────────┘
        └─────────────▶┌───────────────────┐
                       │     AuditLog      │ (System action trail)
                       └───────────────────┘
```

---

# 10. REDIS USAGE & INVALIDATION ARCHITECTURE

```text
┌─────────────────────────┬───────────────────────────────┬──────────┬────────────────────────┐
│ Key Pattern             │ Purpose                       │ TTL      │ Invalidation Mechanism │
├─────────────────────────┼───────────────────────────────┼──────────┼────────────────────────┤
│ otp:+91XXXXXXXXXX       │ Passwordless auth verification│ 5 mins   │ Explicit DEL on verify │
│ otp_attempts:+91...     │ Brute-force failure counter   │ 5 mins   │ Explicit DEL on verify │
│ otp_cooldown:+91...     │ 60-second rate limiter        │ 60 secs  │ Natural TTL expiry     │
│ refresh:<token>         │ Session user ID mapping       │ 30 days  │ Rotated on refresh/DEL │
│ page:<pageName>:<temple>│ High-performance BFF cache    │ 5 mins   │ Non-blocking SCAN loop │
│ rl:<ip/phone>:<endpoint>│ Sliding-window rate limit     │ 60 secs  │ Sliding window expiry  │
└─────────────────────────┴───────────────────────────────┴──────────┴────────────────────────┘
```

---

# 11. MEDIA & FILE UPLOAD ARCHITECTURE

```text
[ Admin or Staff ]
       │
       ▼ 1. Request Signed Upload URL
POST /api/v1/temples/:templeId/gallery/presigned-url
{
  "category": "gallery",
  "fileName": "festival_celebration.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 2048576
}
       │
Backend validates:
- Allowed MIME: image/jpeg, image/png, image/webp, audio/mpeg, application/pdf
- Max File Size: 10MB (images), 50MB (audio/media)
       │
Backend generates S3 / Cloudflare R2 / Cloudinary signed direct upload URL
       │
       ▼ 2. Return Upload Contract
{
  "success": true,
  "data": {
    "uploadUrl": "https://temple-assets.s3.ap-south-1.amazonaws.com/gallery/123.jpg?X-Amz-Signature=...",
    "publicUrl": "https://assets.temple.org/gallery/123.jpg",
    "fileKey": "gallery/123.jpg",
    "method": "PUT",
    "headers": { "Content-Type": "image/jpeg" },
    "expiresIn": 900
  }
}
       │
       ▼ 3. Client Direct Upload
Frontend sends PUT request with binary file directly to S3 / Cloudinary (bypassing backend CPU/RAM)
       │
       ▼ 4. Save Metadata in Database
POST /api/v1/temples/:templeId/gallery
{
  "title": "Maha Shivaratri Darshan",
  "mediaUrl": "https://assets.temple.org/gallery/123.jpg",
  "mediaType": "IMAGE",
  "isPublished": true
}
```

---

# 12. NOTIFICATION & ANNOUNCEMENT ARCHITECTURE

* **Devotee In-App Notifications**: Real-time user notifications generated upon booking confirmation, donation receipt generation, and room check-in. Devotees fetch their notifications via `GET /api/v1/notifications/me` and mark read via `PUT /notifications/me/:id/read`.
* **Temple Announcements**: Admins post public banners and operational notices via `POST /api/v1/notifications/temples/:templeId/announcements`. Active notices are automatically included in the `GET /pages/home` response.
* **Push / SMS Gateway Status**: Push notification tokens (`fcmToken`) and SMS integration points are modeled and ready for production API credentials; in local development, notifications are saved to database tables for frontend display.

---

# 13. ERROR HANDLING ARCHITECTURE

All errors are intercepted by global filters (`HttpExceptionFilter`, `PrismaExceptionFilter`, `AllExceptionsFilter`) and formatted into the standard schema:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Slot capacity exceeded for selected date"
  }
}
```

### Standard Error Codes:
* `400 Bad Request`: `BAD_REQUEST`, `VALIDATION_ERROR` (DTO validation failures with field arrays).
* `401 Unauthorized`: `UNAUTHORIZED`, `INVALID_OTP`, `TOKEN_EXPIRED`.
* `403 Forbidden`: `FORBIDDEN` (Unassigned staff temple access attempt or suspended account).
* `404 Not Found`: `NOT_FOUND` (Temple, slot, booking, or user does not exist).
* `409 Conflict`: `CONFLICT` (Concurrent booking conflict or duplicate unique field).
* `429 Too Many Requests`: `TOO_MANY_REQUESTS` (Rate limit exceeded on OTP/login).

---

# 14. COMPLETE BACKEND MASTER FLOW CHART

```text
                         ┌─────────────────────────────────────────┐
                         │       DEVOTEE / STAFF / ADMIN USER      │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │      FRONTEND APP / ADMIN DASHBOARD     │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼ HTTP Request
                         ┌─────────────────────────────────────────┐
                         │         NESTJS GLOBAL MIDDLEWARE        │
                         │  - Request ID (x-request-id tracing)    │
                         │  - Helmet Security Headers & CORS       │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │     GLOBAL PIPES & GUARDS VALIDATION    │
                         │  - CustomValidationPipe (DTO Validation)│
                         │  - RateLimitGuard (Redis Sliding Window)│
                         └────────────────────┬────────────────────┘
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
               [ Public Endpoint ]                        [ Secured Endpoint ]
                         │                                         │
                         │                                  [ JwtAuthGuard ]
                         │                                 Is Bearer token valid?
                         │                                         │
                         │                                  [ RolesGuard ]
                         │                                 Is role authorized?
                         │                                         │
                         │                                [ TempleAccessGuard ]
                         │                               Is staff assigned to temple?
                         │                                         │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │       CONTROLLER ROUTING HANDLER        │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │         DOMAIN SERVICE LAYER            │
                         └────────────────────┬────────────────────┘
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      ▼                       ▼                       ▼
            ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
            │   POSTGRESQL DB   │   │    REDIS STORE    │   │   EXTERNAL APIS   │
            │  (Prisma Models)  │   │ (OTPs/Caches/SCAN)│   │  (Cashfree / S3)  │
            └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
                      │                       │                       │
                      └───────────────────────┼───────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │   STANDARDIZED API RESPONSE ENVELOPE    │
                         │   { "success": true, "data": { ... }  │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │     FRONTEND / ADMIN UI HYDRATION       │
                         └─────────────────────────────────────────┘
```

---

# 15. COMPLETE FEATURE JOURNEY FLOW CHART

```text
                                  TEMPLE DIGITAL PLATFORM
                                             │
         ┌───────────────────────────────────┼───────────────────────────────────┐
         ▼                                   ▼                                   ▼
  [ PUBLIC DISCOVERY ]              [ DEVOTEE TRANSACTIONS ]            [ ADMIN & OPERATIONS ]
         │                                   │                                   │
         ├─ Home BFF (/pages/home)           ├─ Auth (/auth/send-otp)            ├─ Admin Login (OTP + JWT)
         ├─ Temple Info & History            ├─ Select Offering (Puja/Seva/Darshan)├─ Active Temple Select
         ├─ Deities & Aarti Timings          ├─ Hold Slot (/bookings)            ├─ Staff Assignments
         ├─ Nitya Paath Audio & Lyrics       ├─ Cashfree Checkout (/payments)    ├─ Schedules & Capacities
         ├─ Gurukul & Dincharya              ├─ Receive Confirmation + QR Ticket ├─ QR Entry Check-In Scanner
         ├─ Prasad Catalog                   ├─ Online Donations + 80G Receipts  ├─ Prasad Stock Adjustments
         ├─ Room Types & Rates               ├─ Room Reservation Booking         ├─ Room Check-In & Check-Out
         └─ Spiritual Q&A (/jigyasa)         └─ View Booking History (/me)       └─ Revenue & Audit Reports
```

---

# 16. INCOMING FRONTEND DEVELOPER HANDOFF GUIDE

### "If I am a Frontend Developer, what do I need to know?"

1. **Base API URL**: `http://localhost:3000/api/v1`
2. **Interactive Swagger Documentation**: `http://localhost:3000/docs`
3. **Authentication**: Call `POST /auth/send-otp` with `{ phone }`, then `POST /auth/verify-otp` with `{ phone, otp }`. In development mode, the OTP is `123456`. Store the returned `accessToken` in memory/state and attach it to subsequent requests via `Authorization: Bearer <accessToken>`.
4. **Currency Rule**: All monetary values are integer **Paise** (`amountPaise`, `pricePaise`). Divide by `100` for display (e.g. `10000 paise = ₹100.00`).
5. **Dates & Schedules**: Timestamps are UTC ISO-8601 strings (`2026-08-24T15:30:00.000Z`). Slot date filters use `YYYY-MM-DD`.
6. **Use BFF Pages**: For screen hydration, use the dedicated `/pages/*` endpoints to fetch all required screen components in a single fast HTTP call.

### Recommended Integration Order:
```text
1. Health Check               -> GET /health
2. OTP Authentication         -> POST /auth/send-otp, POST /auth/verify-otp
3. Temple Selection           -> GET /temples, GET /pages/home?templeId=...
4. Offerings & Slots          -> GET /temples/:templeId/puja, /seva, /darshan
5. Booking Engine             -> POST /bookings (Hold slot)
6. Cashfree Payment           -> POST /payments/create-order -> Cashfree Drop-in SDK
7. QR Ticket & Receipt        -> GET /bookings/me, GET /payments/receipt/:id
8. Prasad & Accommodation     -> POST /temples/:templeId/prasad/orders, /accommodation/book
9. Donations                  -> POST /temples/:templeId/donations
10. Community Features        -> Paath (/paath), Gurukul (/gurukul), Jigyasa (/jigyasa)
```

---

# 17. INCOMING ADMIN PANEL DEVELOPER HANDOFF GUIDE

### "If I am an Admin Panel Developer, what do I need to know?"

1. **Admin Authentication**: Log in via OTP using an Admin phone number (e.g. `+918888888888` or SuperAdmin `+919999999999` with OTP `123456`).
2. **Role & Temple Discovery**: Read `user.role` from the login response. If `role` is `ADMIN`, `MANAGER`, or `STAFF`, call `GET /admin/users/:userId/temples` to populate the active temple switcher. If `role` is `SUPER_ADMIN`, call `GET /temples` to allow managing any temple.
3. **Temple Scoping**: Pass the active `templeId` in the URL path (`/api/v1/temples/:templeId/*`) or request body for temple operations.
4. **Staff Management**: Assign users to temples via `POST /admin/temples/:templeId/staff` and list staff via `GET /admin/temples/:templeId/staff`.
5. **QR Check-In Scanner**: Implement camera barcode scanner calling `POST /api/v1/qr/check-in/booking` with `{ qrToken, templeId }`.
6. **Reports & Logs**: Render dashboard stats via `GET /admin/temples/:templeId/dashboard`, revenue charts via `GET /admin/temples/:templeId/revenue`, and system audit trails via `GET /admin/audit-logs`.

---

# 18. ENVIRONMENT VARIABLE AUDIT

| Variable | Used By | Required Local? | Required Production? | Secret? | Default / Notes |
|---|---|---|---|---|---|
| `NODE_ENV` | Global Runtime | Yes | Yes | No | `development` (enables Swagger & dev OTP) |
| `PORT` | Web Server | Optional | Optional | No | `3000` |
| `API_PREFIX` | Router | Optional | Optional | No | `api/v1` |
| `DATABASE_URL` | Prisma Client | Yes | Yes | Yes | `postgresql://user:pass@localhost:5432/temple` |
| `REDIS_URL` | Redis Client | Yes | Yes | Yes | `redis://localhost:6379` |
| `JWT_SECRET` | Auth Token Signing | Yes | Yes | Yes | Min 32-character random string |
| `JWT_REFRESH_SECRET` | Refresh Tokens | Optional | Optional | Yes | Min 32-character random string |
| `DEV_OTP` | Auth Service | Optional | No (Ignored in prod) | No | `123456` (Active only when `NODE_ENV!=production`) |
| `CASHFREE_APP_ID` | Cashfree SDK | Optional (sandbox) | Yes | Yes | Cashfree Merchant App ID |
| `CASHFREE_SECRET_KEY` | Cashfree SDK | Optional (sandbox) | Yes | Yes | Cashfree Secret Key |
| `CASHFREE_WEBHOOK_SECRET` | Webhook Verifier | Optional (sandbox) | Yes | Yes | Webhook verification signing secret |
| `CASHFREE_ENVIRONMENT` | Cashfree SDK | Optional | Yes | No | `sandbox` or `production` |
| `S3_BUCKET_NAME` | Media Upload | Optional | Yes | No | S3 bucket name for uploads |
| `AWS_ACCESS_KEY_ID` | S3 Upload Signing | Optional | Yes | Yes | AWS IAM Access Key |
| `AWS_SECRET_ACCESS_KEY` | S3 Upload Signing | Optional | Yes | Yes | AWS IAM Secret Key |
| `CORS_ORIGINS` | CORS Policy | Optional | Yes | No | Comma-separated allowed frontend domains |
| `ENABLE_SWAGGER` | Swagger Docs | Optional | Optional | No | `true` in dev, `false` in prod |

---

# 19. LOCAL DEVELOPMENT ONBOARDING GUIDE

New incoming developers can get the backend running locally with zero manual code fixes:

```bash
# 1. Clone repository
git clone <repo-url> && cd temple_project

# 2. Install dependencies
pnpm install

# 3. Start local PostgreSQL and Redis containers
docker compose up -d

# 4. Apply database migrations
npx prisma migrate deploy

# 5. Seed development master & test data
npm run seed

# 6. Start development server
npm run start:dev

# 7. Open Swagger Documentation in browser
# http://localhost:3000/docs
```

---

# 20. TEST & BUILD VERIFICATION RESULTS

```text
> npx prisma validate
✔ The schema at prisma/schema.prisma is valid 🚀

> npx prisma migrate status
✔ 3 migrations found. Database schema is up to date!

> npm test
✔ Test Suites: 21 passed, 21 total
✔ Tests:       231 passed, 231 total
✔ Snapshots:   0 total
✔ Time:        11.019 s

> npm run build
✔ Successfully compiled: 138 files with swc (144.39ms)
```

---

# 21. BLOCKER CLASSIFICATION

### 🔴 BLOCKERS (0)
* **None**. There are zero blockers for frontend or admin panel development.

### 🟡 NON-BLOCKING ITEMS (External Production Provisioning)
* Cloud Managed PostgreSQL 16+ instance.
* Cloud Managed Redis 7+ instance.
* S3 media bucket provisioning.
* Cashfree live merchant KYC activation.

### 🟢 COMPLETE (100%)
* All 214 REST endpoints, controllers, services, guards, and DTOs.
* Multi-temple staff isolation & RBAC authorization.
* Prisma schema (42 models, 26 enums, 3 migrations).
* Redis SCAN non-blocking cache invalidation.
* Comprehensive Swagger OpenAPI documentation.
* Complete test suite (231 passing tests) and clean build.

---

# 22. FINAL EXTERNAL REQUIREMENTS

### Needed NOW for Frontend / Admin Development:
* **Nothing external**. Everything runs locally using Docker PostgreSQL and Redis with sandbox mock OTPs (`123456`).

### Needed LATER for Production Deployment:
* Managed PostgreSQL connection string (`DATABASE_URL`).
* Managed Redis connection string (`REDIS_URL`).
* AWS S3 / Cloudinary credentials.
* Cashfree live production API credentials.
* Domain, DNS, and TLS certificates.

---

# 23. FINAL HANDOFF VERDICT

```text
Can the frontend team start?             YES
Can the admin team start?                YES
Is backend code blocking them?           NO
Are API contracts usable?                YES
Is local development reproducible?       YES
Are external services required NOW?      NO
Is production infrastructure required?   NO (Only when deploying to live users)
```

## What I Should Do Next:

> **Backend work is complete for frontend/admin handoff. Do not modify working backend business logic unless an integration issue is discovered during frontend or admin panel implementation.**
>
> **Action**: Share the API Base URL (`http://localhost:3000/api/v1`), Swagger URL (`http://localhost:3000/docs`), and `.env.example` with the Frontend and Admin Panel UI engineering teams to commence client-side development.
