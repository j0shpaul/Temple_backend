# Temple Digital Platform — Frontend Integration API Guide

> **Base URL**: `{HOST}/api/v1`
> **Auth**: Bearer JWT via `Authorization: Bearer <accessToken>`
> **Interactive Docs**: `{HOST}/docs` (Swagger UI)

---

## Table of Contents

0. [Page-Level Aggregation APIs (BFF Layer)](#0-page-level-aggregation-apis-bff-layer)
1. [Authentication](#1-authentication)
2. [Users & Addresses](#2-users--addresses)
3. [Temples](#3-temples)
4. [Temple Info](#4-temple-info)
5. [Deities](#5-deities)
6. [Gallery](#6-gallery)
7. [Darshan](#7-darshan)
8. [Aarti](#8-aarti)
9. [Puja](#9-puja)
10. [Seva](#10-seva)
11. [Bookings](#11-bookings)
12. [Payments](#12-payments)
13. [Donations](#13-donations)
14. [Prasad](#14-prasad)
15. [Accommodation](#15-accommodation)
16. [Events](#16-events)
17. [Notifications & Announcements](#17-notifications--announcements)
18. [QR Verification & Check-in](#18-qr-verification--check-in)
19. [Admin Dashboard](#19-admin-dashboard)
20. [Standard Response Format](#20-standard-response-format)
21. [Error Handling](#21-error-handling)
22. [Pagination](#22-pagination)

---

## 0. Page-Level Aggregation APIs (BFF Layer)

These endpoints aggregate multiple domain resources into a single frontend-optimized payload for fast 1-roundtrip page rendering:

### `GET /home`
- **Query**: `templeId` (optional)
- **Description**: Returns temple identity, hero banner, today's darshan schedules & slots, today's aarti timings, featured pujas, featured sevas, upcoming events, active announcements, and featured prasad items.
- **Cache**: 60s Redis cache.

### `GET /about`
- **Query**: `templeId` (optional)
- **Description**: Returns temple basic profile, history, architecture, timings, guidelines, enshrined deities, and gallery preview.
- **Cache**: 120s Redis cache.

### `GET /darshan`
- **Query**: `templeId` (optional), `date` (`YYYY-MM-DD`, optional)
- **Description**: Returns darshan schedules, real-time slot availability for the selected date, today's aartis, and dress code guidelines.
- **Cache**: 15s Redis cache.

### `GET /puja`
- **Query**: `templeId` (optional), `deityId` (optional), `date` (`YYYY-MM-DD`, optional)
- **Description**: Returns puja ceremonies catalog, deity categories, and available booking slots for the date.
- **Cache**: 30s Redis cache.

### `GET /seva`
- **Query**: `templeId` (optional), `deityId` (optional), `date` (`YYYY-MM-DD`, optional)
- **Description**: Returns seva offerings catalog, deity categories, and available booking slots for the date.
- **Cache**: 30s Redis cache.

### `GET /events`
- **Query**: `templeId` (optional), `page` (default 1), `limit` (default 10), `upcoming` (default true)
- **Description**: Returns paginated active & upcoming festivals, spots remaining, and registration requirements.
- **Cache**: 60s Redis cache.

### `GET /prasad`
- **Query**: `templeId` (optional), `page` (default 1), `limit` (default 20)
- **Description**: Returns paginated prasad products with public stock status and images.
- **Cache**: 60s Redis cache.

### `GET /accommodation`
- **Query**: `templeId` (optional), `checkIn` (optional), `checkOut` (optional), `capacity` (optional)
- **Description**: Returns room types, pricing, amenities, house rules, and real-time room availability for check-in/out range.
- **Cache**: 30s Redis cache.

### `GET /donations`
- **Query**: `templeId` (optional)
- **Description**: Returns active donation causes, 80G tax exemption details, and suggested donation amounts.
- **Cache**: 120s Redis cache.

### `GET /temple-overview`
- **Query**: `templeId` (optional)
- **Description**: Comprehensive temple identity snapshot with timings, contact, location coordinates, deities, and photo gallery.
- **Cache**: 120s Redis cache.

---

## 20. Standard Response Format

All API responses follow this envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "totalPages": 5 }
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Booking not found"
  }
}
```

## 21. Error Handling

| HTTP Status | Meaning |
|---|---|
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource Not Found |
| 409 | Conflict (duplicate, state violation) |
| 500 | Internal Server Error |

## 22. Pagination

Paginated endpoints accept `?page=1&limit=20` query parameters.
Response includes `meta.totalPages` for navigation.

---

## 1. Authentication

Phone-based OTP login. No password.

### `POST /auth/send-otp`
Send OTP to phone number. **No auth required.**

```json
{ "phone": "+919876543210" }
```

Response: `{ "success": true, "data": { "message": "OTP sent", "expiresIn": 300 } }`

### `POST /auth/verify-otp`
Verify OTP and receive JWT tokens. **No auth required.**

```json
{ "phone": "+919876543210", "otp": "123456" }
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "uuid-refresh-token",
    "user": { "id": "...", "phone": "...", "name": "...", "role": "DEVOTEE" }
  }
}
```

> **Dev mode**: OTP `123456` always works when `NODE_ENV !== production`.

### `POST /auth/refresh`
Refresh expired access token.

```json
{ "refreshToken": "uuid-refresh-token" }
```

### `POST /auth/logout` 🔒
Invalidate refresh token.

```json
{ "refreshToken": "uuid-refresh-token" }
```

### `GET /auth/profile` 🔒
Get current user profile.

### `POST /auth/profile` 🔒
Update profile (`name`, `email`).

---

## 2. Users & Addresses

All endpoints require auth. Admin endpoints require `ADMIN`/`SUPER_ADMIN`/`MANAGER`/`STAFF` role.

### `GET /users` 🔒 STAFF+
List users with pagination, filtering by `role`, `status`, `search`.

### `GET /users/profile` 🔒
Get current user's full profile.

### `GET /users/:id` 🔒 STAFF+
Get user by ID.

### `PUT /users/:id/role` 🔒 ADMIN+
Update user role: `{ "role": "STAFF" }`

### `PUT /users/:id/status` 🔒 ADMIN+
Update user status: `{ "status": "SUSPENDED" }`

### `POST /users/addresses` 🔒
Add address to current user.

```json
{
  "label": "Home",
  "line1": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001"
}
```

### `PUT /users/addresses/:addressId` 🔒
Update user address.

### `DELETE /users/addresses/:addressId` 🔒
Delete user address.

---

## 3. Temples

### `GET /temples`
List all temples. **Public.**

### `GET /temples/:id`
Get temple by ID with full details. **Public.**

### `POST /temples` 🔒 ADMIN+
Create temple.

### `PUT /temples/:id` 🔒 ADMIN+
Update temple.

### `DELETE /temples/:id` 🔒 ADMIN+
Delete temple.

---

## 4. Temple Info

### `GET /temples/:templeId/info`
Get rich temple information (history, timings, facilities). **Public.**

### `POST /temples/:templeId/info` 🔒 STAFF+
Create/update temple information.

### `PUT /temples/:templeId/info/:id` 🔒 STAFF+
Update temple info.

### `DELETE /temples/:templeId/info/:id` 🔒 ADMIN+
Delete temple info.

---

## 5. Deities

### `GET /temples/:templeId/deities`
List deities for temple. **Public.**

### `GET /temples/:templeId/deities/:id`
Get deity by ID. **Public.**

### `POST /temples/:templeId/deities` 🔒 STAFF+
Create deity.

### `PUT /temples/:templeId/deities/:id` 🔒 STAFF+
Update deity.

### `DELETE /temples/:templeId/deities/:id` 🔒 ADMIN+
Delete deity.

---

## 6. Gallery

### `GET /temples/:templeId/gallery`
List gallery items. **Public.**

### `GET /temples/:templeId/gallery/:id`
Get gallery item. **Public.**

### `POST /temples/:templeId/gallery` 🔒 STAFF+
Create gallery item.

### `PUT /temples/:templeId/gallery/:id` 🔒 STAFF+
Update gallery item.

### `DELETE /temples/:templeId/gallery/:id` 🔒 ADMIN+
Delete gallery item.

---

## 7. Darshan

### `GET /temples/:templeId/darshan/schedules`
List darshan schedules. **Public.**

### `GET /temples/:templeId/darshan/schedules/:id`
Get schedule by ID. **Public.**

### `POST /temples/:templeId/darshan/schedules` 🔒 STAFF+
Create darshan schedule (auto-generates 30 days of slots).

```json
{
  "name": "Morning Darshan",
  "startTime": "06:00",
  "endTime": "12:00",
  "maxCapacity": 50
}
```

### `PUT /temples/:templeId/darshan/schedules/:id` 🔒 STAFF+
Update schedule.

### `DELETE /temples/:templeId/darshan/schedules/:id` 🔒 ADMIN+
Delete schedule.

### `GET /temples/:templeId/darshan/slots`
List slots with availability. Supports `?date=2026-08-20&scheduleId=...`.

### `PUT /temples/:templeId/darshan/slots/:id` 🔒 STAFF+
Update slot capacity/status.

### `GET /temples/:templeId/darshan/availability/:date`
Get real-time darshan availability for a date. **Public.**

---

## 8. Aarti

### `GET /temples/:templeId/aarti`
List aarti schedules. **Public.**

### `GET /temples/:templeId/aarti/today`
Today's aarti schedule. **Public.**

### `GET /temples/:templeId/aarti/upcoming`
Upcoming aarti. **Public.**

### `GET /temples/:templeId/aarti/:id`
Get aarti by ID. **Public.**

### `POST /temples/:templeId/aarti` 🔒 STAFF+
Create aarti.

### `PUT /temples/:templeId/aarti/:id` 🔒 STAFF+
Update aarti.

### `DELETE /temples/:templeId/aarti/:id` 🔒 ADMIN+
Delete aarti.

---

## 9. Puja

### `GET /temples/:templeId/pujas`
List pujas. **Public.**

### `GET /temples/:templeId/pujas/:id`
Get puja with slots. **Public.**

### `POST /temples/:templeId/pujas` 🔒 STAFF+
Create puja service.

### `PUT /temples/:templeId/pujas/:id` 🔒 STAFF+
Update puja.

### `DELETE /temples/:templeId/pujas/:id` 🔒 ADMIN+
Delete puja.

### `GET /temples/:templeId/pujas/availability`
Get puja availability for date. **Public.** Query: `?date=2026-08-20`

### `GET /temples/:templeId/pujas/slots`
List puja slots. Query: `?pujaId=...&date=...`

### `POST /temples/:templeId/pujas/slots` 🔒 STAFF+
Create puja slot.

### `PUT /temples/:templeId/pujas/slots/:id` 🔒 STAFF+
Update puja slot.

---

## 10. Seva

### `GET /temples/:templeId/sevas`
List sevas. **Public.**

### `GET /temples/:templeId/sevas/:id`
Get seva with slots. **Public.**

### `POST /temples/:templeId/sevas` 🔒 STAFF+
Create seva.

### `PUT /temples/:templeId/sevas/:id` 🔒 STAFF+
Update seva.

### `DELETE /temples/:templeId/sevas/:id` 🔒 ADMIN+
Delete seva.

### `GET /temples/:templeId/sevas/availability`
Get seva availability. Query: `?date=2026-08-20`

### `GET /temples/:templeId/sevas/slots`
List seva slots.

### `POST /temples/:templeId/sevas/slots` 🔒 STAFF+
Create seva slot.

### `PUT /temples/:templeId/sevas/slots/:id` 🔒 STAFF+
Update seva slot.

---

## 11. Bookings

### `POST /bookings/puja` 🔒
Book a puja slot.

```json
{
  "templeId": "...",
  "pujaId": "...",
  "slotId": "...",
  "quantity": 1,
  "devoteeName": "Ram",
  "devoteePhone": "+919876543210",
  "attendees": [{ "name": "Sita", "phone": "+919876543211" }]
}
```

### `POST /bookings/seva` 🔒
Book a seva slot (same structure, uses `sevaId`).

### `POST /bookings/darshan` 🔒
Book darshan (uses `scheduleId`, `slotId`).

### `GET /bookings/me` 🔒
User's bookings with pagination. Query: `?status=CONFIRMED&page=1&limit=20`

### `GET /bookings/:id` 🔒
Get booking by ID (IDOR-protected: user sees own, staff sees any).

### `POST /bookings/:id/cancel` 🔒
Cancel booking with reason. Atomically decrements slot booked count.

```json
{ "reason": "Change of plans" }
```

### `POST /bookings/:id/check-in` 🔒 STAFF+
Mark booking as checked in.

---

## 12. Payments

### `POST /payments/booking` 🔒
Initiate Razorpay payment for booking.

```json
{ "bookingId": "..." }
```

Response includes `razorpayOrderId`, `keyId`, `amountPaise`.

### `POST /payments/verify` 🔒
Verify Razorpay payment signature. Atomically updates payment + booking status.

```json
{
  "bookingId": "...",
  "razorpayOrderId": "order_...",
  "razorpayPaymentId": "pay_...",
  "razorpaySignature": "..."
}
```

### `POST /payments/webhook`
Razorpay webhook endpoint. Idempotent processing. **No auth** (validated via Razorpay signature).

### `GET /payments/:id` 🔒
Get payment details with event history.

### `GET /payments/me` 🔒
User's payment history. Query: `?page=1&limit=20`

### `POST /payments/:id/refund` 🔒 MANAGER+
Refund payment. Optional partial refund via `amountPaise`.

---

## 13. Donations

### `GET /temples/:templeId/donations/causes`
List active donation causes. **Public.**

### `POST /temples/:templeId/donations/causes` 🔒 STAFF+
Create donation cause.

### `PUT /temples/:templeId/donations/causes/:id` 🔒 STAFF+
Update cause.

### `DELETE /temples/:templeId/donations/causes/:id` 🔒 ADMIN+
Delete cause.

### `POST /temples/:templeId/donations` 🔒
Create donation (initiates Razorpay order).

```json
{
  "causeId": "...",
  "amountPaise": 100000,
  "isAnonymous": false,
  "donorName": "Ram",
  "message": "Om Namah Shivaya"
}
```

### `POST /temples/:templeId/donations/verify` 🔒
Verify donation payment.

### `GET /temples/:templeId/donations/me` 🔒
User's donations.

### `GET /temples/:templeId/donations` 🔒 STAFF+
All temple donations (admin view).

### `GET /temples/:templeId/donations/:id` 🔒
Get donation by ID.

### `GET /temples/:templeId/donations/:id/receipt` 🔒
Get donation receipt (80G tax receipt).

---

## 14. Prasad

### `GET /temples/:templeId/prasad`
List prasad items. **Public.**

### `GET /temples/:templeId/prasad/:id`
Get prasad item. **Public.**

### `POST /temples/:templeId/prasad` 🔒 STAFF+
Create prasad item.

### `PUT /temples/:templeId/prasad/:id` 🔒 STAFF+
Update prasad item.

### `DELETE /temples/:templeId/prasad/:id` 🔒 ADMIN+
Delete prasad item.

### `POST /temples/:templeId/prasad/orders` 🔒
Create prasad order.

```json
{
  "items": [{ "prasadId": "...", "quantity": 2 }],
  "deliveryAddressId": "address-id"
}
```

### `POST /temples/:templeId/prasad/orders/verify` 🔒
Verify prasad order payment.

### `GET /temples/:templeId/prasad/orders/me` 🔒
User's prasad orders.

### `GET /temples/:templeId/prasad/orders` 🔒 STAFF+
All prasad orders (admin view).

### `GET /temples/:templeId/prasad/orders/:id` 🔒
Get prasad order.

### `PUT /temples/:templeId/prasad/orders/:id/status` 🔒 STAFF+
Update order status (`PREPARING`, `SHIPPED`, `DELIVERED`).

### `POST /temples/:templeId/prasad/:id/stock` 🔒 STAFF+
Adjust prasad stock: `{ "delta": 50 }` or `{ "delta": -10 }`

---

## 15. Accommodation

### `GET /temples/:templeId/accommodation/rooms`
List rooms. **Public.**

### `GET /temples/:templeId/accommodation/rooms/:id`
Get room. **Public.**

### `POST /temples/:templeId/accommodation/rooms` 🔒 MANAGER+
Create room.

### `PUT /temples/:templeId/accommodation/rooms/:id` 🔒 MANAGER+
Update room.

### `DELETE /temples/:templeId/accommodation/rooms/:id` 🔒 ADMIN+
Delete room.

### `GET /temples/:templeId/accommodation/availability`
Check room availability. Query: `?checkIn=2026-08-20&checkOut=2026-08-22`

### `POST /temples/:templeId/accommodation/bookings` 🔒
Book accommodation.

```json
{
  "roomId": "...",
  "checkIn": "2026-08-20",
  "checkOut": "2026-08-22",
  "guests": 2,
  "guestName": "Ram",
  "guestPhone": "+919876543210"
}
```

### `POST /temples/:templeId/accommodation/bookings/verify` 🔒
Verify accommodation payment.

### `GET /temples/:templeId/accommodation/bookings/me` 🔒
User's accommodation bookings.

### `GET /temples/:templeId/accommodation/bookings` 🔒 STAFF+
All temple bookings.

### `GET /temples/:templeId/accommodation/bookings/:id` 🔒
Get booking by ID.

### `POST /temples/:templeId/accommodation/bookings/:id/cancel` 🔒
Cancel accommodation booking.

### `POST /temples/:templeId/accommodation/bookings/:id/check-in` 🔒 STAFF+
Check in guest.

### `POST /temples/:templeId/accommodation/bookings/:id/check-out` 🔒 STAFF+
Check out guest.

---

## 16. Events

### `GET /temples/:templeId/events`
List events. Query: `?status=PUBLISHED&upcoming=true`. **Public.**

### `GET /temples/:templeId/events/:id`
Get event with registration count. **Public.**

### `POST /temples/:templeId/events` 🔒 MANAGER+
Create event.

### `PUT /temples/:templeId/events/:id` 🔒 MANAGER+
Update event.

### `DELETE /temples/:templeId/events/:id` 🔒 ADMIN+
Delete event.

### `POST /temples/:templeId/events/:id/register` 🔒
Register for event. Returns QR token.

### `POST /temples/:templeId/events/:id/cancel` 🔒
Cancel event registration.

### `GET /temples/:templeId/events/registrations/me` 🔒
User's event registrations.

### `GET /temples/:templeId/events/:id/registrations` 🔒 STAFF+
Event registrations list.

### `GET /temples/:templeId/events/qr/verify/:qrToken` 🔒 STAFF+
Verify event QR token.

---

## 17. Notifications & Announcements

### `GET /notifications/me` 🔒
User's notifications. Query: `?unreadOnly=true&page=1&limit=20`

### `GET /notifications/me/unread-count` 🔒
Unread notification count.

### `PUT /notifications/me/:id/read` 🔒
Mark notification as read.

### `PUT /notifications/me/read-all` 🔒
Mark all notifications as read.

### `GET /notifications/temples/:templeId/announcements`
List temple announcements. **Public.**

### `POST /notifications/temples/:templeId/announcements` 🔒 STAFF+
Create announcement.

### `GET /notifications/temples/:templeId/announcements/:id`
Get announcement. **Public.**

### `PUT /notifications/temples/:templeId/announcements/:id` 🔒 STAFF+
Update announcement.

### `POST /notifications/temples/:templeId/announcements/:id/publish` 🔒 STAFF+
Publish announcement.

### `DELETE /notifications/temples/:templeId/announcements/:id` 🔒 ADMIN+
Delete announcement.

### `POST /notifications/admin/send` 🔒 ADMIN+
Send notification to specific user.

### `POST /notifications/admin/broadcast` 🔒 ADMIN+
Broadcast notification to all users.

---

## 18. QR Verification & Check-in

### `GET /qr/verify/:qrToken` 🔒 STAFF+
Universal QR verification. Returns entity type (booking/event/accommodation) + details.

### `POST /qr/check-in/booking` 🔒 STAFF+
Check in booking via QR. `{ "qrToken": "...", "templeId": "..." }`

### `POST /qr/check-in/event` 🔒 STAFF+
Check in event registration via QR. `{ "qrToken": "..." }`

### `POST /qr/check-in/accommodation` 🔒 STAFF+
Check in accommodation via QR. `{ "qrToken": "...", "templeId": "..." }`

### `POST /qr/check-out/accommodation` 🔒 STAFF+
Check out accommodation via QR.

### `POST /qr/temples/:templeId/regenerate/booking-qrs` 🔒 MANAGER+
Regenerate missing booking QR codes.

### `POST /qr/temples/:templeId/regenerate/accommodation-qrs` 🔒 MANAGER+
Regenerate missing accommodation QR codes.

---

## 19. Admin Dashboard

All admin endpoints require `ADMIN`/`SUPER_ADMIN` role.

### `GET /admin/audit-logs` 🔒 ADMIN+
Query audit logs. Filters: `actorId`, `action`, `entity`, `entityId`, `from`, `to`.

### `GET /admin/audit-logs/:id` 🔒 ADMIN+
Get audit log detail.

### `GET /admin/temples/:templeId/crowd` 🔒 STAFF+
Real-time crowd status with breakdown (darshan, puja, seva, accommodation, events).

### `GET /admin/temples/:templeId/crowd/history` 🔒 STAFF+
Historical crowd data. Filters: `from`, `to`.

### `POST /admin/temples/:templeId/crowd/snapshot` 🔒 STAFF+
Record manual crowd snapshot.

### `GET /admin/users` 🔒 ADMIN+
List all users with search/filter.

### `GET /admin/users/:id` 🔒 ADMIN+
Get user detail.

### `PUT /admin/users/:id/role` 🔒 ADMIN+
Update user role.

### `PUT /admin/users/:id/status` 🔒 ADMIN+
Suspend/activate user.

### `GET /admin/temples/:templeId/dashboard` 🔒 STAFF+
Comprehensive dashboard with today's stats, revenue, occupancy.

### `GET /admin/temples/:templeId/revenue` 🔒 STAFF+
Revenue breakdown by source (bookings, donations, prasad, accommodation).

---

## Frontend Integration Checklist

### Razorpay Payment Flow
1. Call `POST /payments/booking` → get `razorpayOrderId`, `keyId`, `amountPaise`
2. Open Razorpay checkout with those params
3. On success callback, call `POST /payments/verify` with `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`
4. Poll booking status or show confirmation

### QR Check-in Flow
1. Staff scans QR code → extract `qrToken`
2. Call `GET /qr/verify/:qrToken` → get entity type + details
3. Show preview to staff
4. Call `POST /qr/check-in/{type}` to confirm check-in

### Authentication Flow
1. `POST /auth/send-otp` → user receives OTP
2. `POST /auth/verify-otp` → get `accessToken` + `refreshToken`
3. Store both tokens (secure storage)
4. Use `accessToken` in `Authorization: Bearer` header
5. When 401, call `POST /auth/refresh` with `refreshToken`
6. On logout, call `POST /auth/logout`

### Role Hierarchy
`SUPER_ADMIN` > `ADMIN` > `MANAGER` > `STAFF` > `DEVOTEE`
