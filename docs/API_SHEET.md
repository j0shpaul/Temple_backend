# 🏛️ Temple Digital Platform — Frontend API Master Sheet

> **Protocol**: HTTPS / RESTful JSON  
> **Default Global Prefix**: `/api/v1`  
> **Interactive Swagger Documentation**: `http://localhost:3000/docs` (or `https://<YOUR-DEPLOYED-URL>/docs`)  
> **Standard Request Header**: `Content-Type: application/json`  
> **Authenticated Request Header**: `Authorization: Bearer <accessToken>`

---

## ⚡ 0. Page-Level Read Aggregations (BFF Layer — Fast 1-Call Page Loads)

Use these optimized aggregation endpoints to render complete screens with a single network request:

| Endpoint | Method | Query Parameters | Aggregated Data Returned |
|---|---|---|---|
| `/api/v1/home` | `GET` | `?templeId=...` | `{ temple, hero, todayDarshan, todayAarti, featuredPuja, featuredSeva, upcomingEvents, announcements, featuredPrasad }` |
| `/api/v1/about` | `GET` | `?templeId=...` | `{ temple, info: { history, architecture, timings, guidelines, about }, deities, gallery }` |
| `/api/v1/darshan` | `GET` | `?templeId=...&date=YYYY-MM-DD` | `{ temple, selectedDate, guidelines, dressCode, schedules, slots, todayAarti }` |
| `/api/v1/puja` | `GET` | `?templeId=...&deityId=...&date=YYYY-MM-DD` | `{ temple, selectedDate, deities, pujas: [{ id, name, pricePaise, durationMinutes, deity, availableSlots }] }` |
| `/api/v1/seva` | `GET` | `?templeId=...&deityId=...&date=YYYY-MM-DD` | `{ temple, selectedDate, deities, sevas: [{ id, name, pricePaise, durationMinutes, deity, availableSlots }] }` |
| `/api/v1/events` | `GET` | `?templeId=...&page=1&limit=10&upcoming=true` | `{ temple, events: [{ id, title, startDate, endDate, capacity, registeredCount, availableSpots }], pagination }` |
| `/api/v1/prasad` | `GET` | `?templeId=...&page=1&limit=20` | `{ temple, products: [{ id, name, pricePaise, imageUrl, inStock, availableStock }], pagination }` |
| `/api/v1/accommodation` | `GET` | `?templeId=...&checkIn=...&checkOut=...&capacity=...` | `{ temple, checkIn, checkOut, roomTypes, availableRooms, rules }` |
| `/api/v1/donations` | `GET` | `?templeId=...` | `{ temple, causes, taxExemption: { section: "80G", panRequired }, suggestedAmountsPaise }` |
| `/api/v1/temple-overview` | `GET` | `?templeId=...` | `{ temple, deities, timings, contact, location, gallery }` |

---

## 📋 1. Standard Response & Error Envelope

All responses follow this consistent JSON structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Not enough capacity in this slot"
  }
}
```

---

## 🔐 2. Complete Authentication & Token Flow

| Method | Endpoint | Request Body | Response Payload / Behavior |
|---|---|---|---|
| `POST` | `/api/v1/auth/send-otp` | `{"phone": "+919876543210"}` | `{"message": "OTP sent to your phone number"}` (In dev: includes OTP) |
| `POST` | `/api/v1/auth/verify-otp` | `{"phone": "+919876543210", "otp": "123456"}` | `{"user": {"id": "usr_...", "phone": "...", "role": "DEVOTEE"}, "tokens": {"accessToken": "...", "refreshToken": "...", "expiresIn": 900}}` |
| `POST` | `/api/v1/auth/refresh` | `{"refreshToken": "..."}` | `{"accessToken": "...", "refreshToken": "..."}` |
| `POST` | `/api/v1/auth/logout` | `{"refreshToken": "..."}` | `{"message": "Logged out successfully"}` |
| `GET` | `/api/v1/auth/me` | *(None)* | Returns authenticated user session profile |

---

## 👤 3. User Profile & Address Book

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/users/me` | Devotee | *(None)* | Get devotee profile |
| `PUT` | `/api/v1/users/me` | Devotee | `{"name": "string", "email": "string"}` | Update devotee profile |
| `GET` | `/api/v1/users/me/addresses` | Devotee | *(None)* | List saved delivery addresses |
| `POST` | `/api/v1/users/me/addresses` | Devotee | `{"recipientName": "string", "phone": "string", "line1": "string", "city": "string", "state": "string", "pincode": "string", "isDefault": boolean}` | Create delivery address |
| `GET` | `/api/v1/users/me/addresses/:id` | Devotee | *(None)* | Get delivery address details |
| `PUT` | `/api/v1/users/me/addresses/:id` | Devotee | `{"line1": "string", "city": "string", "pincode": "string"}` | Update address |
| `DELETE` | `/api/v1/users/me/addresses/:id` | Devotee | *(None)* | Delete address |
| `PUT` | `/api/v1/users/me/addresses/:id/default` | Devotee | *(None)* | Set address as default |

---

## 🛕 4. Temples, Deities & Gallery (Public Catalog)

| Method | Endpoint | Auth | Query / Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/temples` | Public | `?search=shree&city=Mumbai&page=1` | List active temples |
| `GET` | `/api/v1/temples/:id` | Public | *(None)* | Get temple profile & address |
| `GET` | `/api/v1/temples/:templeId/info` | Public | *(None)* | Get history, architecture, dress code & timings |
| `GET` | `/api/v1/temples/:templeId/deities` | Public | *(None)* | List enshrined deities |
| `GET` | `/api/v1/temples/:templeId/deities/:id` | Public | *(None)* | Get deity description and details |
| `GET` | `/api/v1/temples/:templeId/gallery` | Public | `?category=festivals` | Photo gallery with captions |
| `GET` | `/api/v1/temples/:templeId/gallery/:id` | Public | *(None)* | Get single photo item details |

---

## 👁️ 5. Darshan & Aarti Schedules

| Method | Endpoint | Auth | Query / Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/temples/:templeId/darshan/schedules` | Public | *(None)* | List Darshan schedules |
| `GET` | `/api/v1/temples/:templeId/darshan/availability/:date` | Public | `date=YYYY-MM-DD` | Real-time Darshan remaining slots & capacity |
| `GET` | `/api/v1/temples/:templeId/aarti` | Public | *(None)* | List standard Aarti timings |
| `GET` | `/api/v1/temples/:templeId/aarti/today` | Public | *(None)* | Today's Aarti schedule with festival overrides |
| `GET` | `/api/v1/temples/:templeId/aarti/:id` | Public | *(None)* | Aarti details |

---

## 🌸 6. Puja & Seva Ceremonies

| Method | Endpoint | Auth | Query / Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/temples/:templeId/puja` | Public | `?deityId=...` | List available Puja offerings & price in paise |
| `GET` | `/api/v1/temples/:templeId/puja/:id` | Public | *(None)* | Puja ceremony details & guidelines |
| `GET` | `/api/v1/temples/:templeId/puja/availability/:date` | Public | `date=YYYY-MM-DD` | Real-time Puja slot availability |
| `GET` | `/api/v1/temples/:templeId/seva` | Public | `?deityId=...` | List available Seva offerings & price in paise |
| `GET` | `/api/v1/temples/:templeId/seva/:id` | Public | *(None)* | Seva details |
| `GET` | `/api/v1/temples/:templeId/seva/availability/:date` | Public | `date=YYYY-MM-DD` | Real-time Seva slot availability |

---

## 🎟️ 7. Unified Booking Engine (Puja, Seva, Darshan)

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/bookings/puja` | Devotee | `{"templeId": "...", "pujaId": "...", "slotId": "...", "quantity": 1, "devoteeName": "Ramesh", "devoteePhone": "+919876543210", "attendees": [{"name": "Ramesh", "age": 42}]}` | Book Puja (atomic reservation) |
| `POST` | `/api/v1/bookings/seva` | Devotee | `{"templeId": "...", "sevaId": "...", "slotId": "...", "quantity": 1, "devoteeName": "Ramesh", "devoteePhone": "+919876543210"}` | Book Seva slot |
| `POST` | `/api/v1/bookings/darshan` | Devotee | `{"templeId": "...", "scheduleId": "...", "slotId": "...", "quantity": 2, "devoteeName": "Ramesh", "devoteePhone": "+919876543210"}` | Book Darshan pass |
| `GET` | `/api/v1/bookings/my` | Devotee | `?status=CONFIRMED&page=1` | Devotee's booking history with QR tokens |
| `GET` | `/api/v1/bookings/:id` | Devotee | *(None)* | Single booking pass & attendee details |
| `POST` | `/api/v1/bookings/:id/cancel` | Devotee | `{"reason": "Unable to attend"}` | Cancel booking and release slot |
| `GET` | `/api/v1/bookings/temple/:templeId` | Staff+ | `?date=YYYY-MM-DD` | Staff list all bookings for temple |

---

## 💳 8. Razorpay Payments Integration

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/payments/booking/:bookingId` | Devotee | *(None)* | Generate Razorpay order for booking |
| `POST` | `/api/v1/payments/donation/:donationId` | Devotee | *(None)* | Generate Razorpay order for donation |
| `POST` | `/api/v1/payments/prasad/:orderId` | Devotee | *(None)* | Generate Razorpay order for Prasad order |
| `POST` | `/api/v1/payments/verify` | Devotee | `{"bookingId": "...", "razorpayOrderId": "...", "razorpayPaymentId": "...", "razorpaySignature": "..."}` | Verify signature and mark order as `CONFIRMED` |
| `POST` | `/api/v1/payments/webhook` | Public | Razorpay Webhook Payload | Gateway asynchronous callback |

### 💡 Frontend Razorpay Modal Integration Example
```javascript
const res = await api.post(`/payments/booking/${bookingId}`);
const { paymentId, razorpayOrderId, amountPaise, currency, keyId } = res.data.data;

const options = {
  key: keyId,
  amount: amountPaise,
  currency: currency || "INR",
  name: "Temple Digital Platform",
  description: "Booking Payment",
  order_id: razorpayOrderId,
  handler: async function (response) {
    await api.post('/payments/verify', {
      bookingId: bookingId,
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    });
    alert("Payment successful & Booking Confirmed!");
  }
};
const rzp = new window.Razorpay(options);
rzp.open();
```

---

## 💰 9. Donations & 80G Tax Receipts

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/temples/:templeId/donations/causes` | Public | *(None)* | List causes (Annadanam, Goshala, Renovation) |
| `GET` | `/api/v1/temples/:templeId/donations/causes/:id` | Public | *(None)* | Cause description |
| `POST` | `/api/v1/temples/:templeId/donations` | Devotee | `{"causeId": "...", "amountPaise": 50000, "donorName": "Suresh", "donorPhone": "+919876543210", "donorPan": "ABCDE1234F", "isAnonymous": false}` | Initiate monetary donation |
| `GET` | `/api/v1/temples/:templeId/donations/my` | Devotee | *(None)* | Devotee donation history |
| `GET` | `/api/v1/temples/:templeId/donations/:id/receipt` | Devotee | *(None)* | Get 80G tax receipt metadata |

---

## 🍬 10. Prasad Catalog & Online Ordering

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/temples/:templeId/prasad/products` | Public | *(None)* | Browse Prasad catalog & remaining stock |
| `GET` | `/api/v1/temples/:templeId/prasad/products/:id` | Public | *(None)* | Single Prasad product details |
| `POST` | `/api/v1/temples/:templeId/prasad/orders` | Devotee | `{"addressId": "...", "items": [{"productId": "...", "quantity": 2}], "notes": "Deliver before 5 PM"}` | Place Prasad order (reserves inventory) |
| `GET` | `/api/v1/temples/:templeId/prasad/orders/my` | Devotee | *(None)* | Devotee's Prasad order history |
| `GET` | `/api/v1/temples/:templeId/prasad/orders/:id` | Devotee | *(None)* | Order status & items |
| `PUT` | `/api/v1/temples/:templeId/prasad/orders/:id/status` | Staff+ | `{"status": "DISPATCHED", "trackingNumber": "TRK123456"}` | Update fulfillment state |

---

## 🛏️ 11. Accommodation & Guest Houses

| Method | Endpoint | Auth | Query / Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/temples/:templeId/accommodation/rooms` | Public | *(None)* | List all guest rooms & amenities |
| `GET` | `/api/v1/temples/:templeId/accommodation/rooms/:id` | Public | *(None)* | Single room details |
| `GET` | `/api/v1/temples/:templeId/accommodation/availability` | Public | `?checkIn=2026-08-25&checkOut=2026-08-28&capacity=2` | Check room availability for date range |
| `POST` | `/api/v1/temples/:templeId/accommodation/bookings` | Devotee | `{"roomId": "...", "checkInDate": "2026-08-25", "checkOutDate": "2026-08-28", "guestName": "Anand", "guestPhone": "+919876543210", "numberOfGuests": 2}` | Book guest room |
| `GET` | `/api/v1/temples/:templeId/accommodation/bookings/my` | Devotee | *(None)* | User's room bookings with QR pass |
| `GET` | `/api/v1/temples/:templeId/accommodation/bookings/:id` | Devotee | *(None)* | Single room booking pass details |

---

## 🎪 12. Festivals & Event Registrations

| Method | Endpoint | Auth | Query / Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/temples/:templeId/events` | Public | `?upcoming=true` | List upcoming utsavs & festivals |
| `GET` | `/api/v1/temples/:templeId/events/:id` | Public | *(None)* | Festival schedule & available spots |
| `POST` | `/api/v1/temples/:templeId/events/:id/register` | Devotee | `{"attendeeName": "Devotee", "attendeePhone": "+919876543210", "numberOfAttendees": 2}` | Register and receive event pass QR |
| `POST` | `/api/v1/temples/:templeId/events/:id/cancel` | Devotee | *(None)* | Cancel event registration pass |
| `GET` | `/api/v1/temples/:templeId/events/registrations/me` | Devotee | *(None)* | List user's registered event passes |
| `GET` | `/api/v1/temples/:templeId/events/:id/registrations` | Staff+ | *(None)* | Staff list all registered attendees |

---

## 🔔 13. In-App Notifications & Announcements

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/notifications/me` | Devotee | `?page=1&limit=20` | Get user notifications |
| `GET` | `/api/v1/notifications/me/unread-count` | Devotee | *(None)* | Get unread notification badge count |
| `PUT` | `/api/v1/notifications/me/:id/read` | Devotee | *(None)* | Mark notification as read |
| `PUT` | `/api/v1/notifications/me/read-all` | Devotee | *(None)* | Mark all notifications as read |
| `GET` | `/api/v1/notifications/temples/:templeId/announcements` | Public | `?active=true` | List live temple broadcast announcements |
| `GET` | `/api/v1/notifications/temples/:templeId/announcements/:id` | Public | *(None)* | Read announcement |

---

## 📲 14. Universal QR Code Check-In (Staff App)

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/qr/verify/:qrToken` | Staff+ | *(None)* | Scan & preview QR pass (Darshan, Puja, Event, Room) |
| `POST` | `/api/v1/qr/check-in/booking` | Staff+ | `{"qrToken": "...", "templeId": "..."}` | Confirm one-time gate entry check-in |
| `POST` | `/api/v1/qr/check-in/event` | Staff+ | `{"qrToken": "...", "templeId": "..."}` | Check in event attendee |
| `POST` | `/api/v1/qr/check-in/accommodation` | Staff+ | `{"qrToken": "...", "templeId": "..."}` | Check in guest to assigned room |
| `POST` | `/api/v1/qr/check-out/accommodation` | Staff+ | `{"qrToken": "...", "templeId": "..."}` | Check out guest and release room |

---

## 📊 15. Admin Operations & Analytics (Admin Portal)

| Method | Endpoint | Auth | Query / Body | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/temples/:templeId/dashboard` | Manager+ | *(None)* | Real-time counts (today's bookings, visitors, revenue) |
| `GET` | `/api/v1/admin/temples/:templeId/crowd` | Staff+ | *(None)* | Real-time crowd occupancy level & percentage |
| `GET` | `/api/v1/admin/temples/:templeId/crowd/history` | Staff+ | `?from=ISO&to=ISO` | Crowd occupancy trends over time |
| `POST` | `/api/v1/admin/temples/:templeId/crowd/snapshot` | Manager+ | `{"level": "HIGH", "occupancyPct": 85, "estimatedCount": 1200}` | Record crowd snapshot |
| `GET` | `/api/v1/admin/temples/:templeId/revenue` | Manager+ | `?from=ISO&to=ISO&groupBy=day` | Revenue breakdown across Bookings, Donations, Prasad & Rooms |
| `GET` | `/api/v1/admin/users` | Manager+ | `?role=DEVOTEE&search=Ramesh&page=1` | User directory with search |
| `GET` | `/api/v1/admin/users/:id` | Manager+ | *(None)* | User details & activity summary |
| `PUT` | `/api/v1/admin/users/:id/role` | Admin+ | `{"role": "STAFF"}` | Elevate or change user role |
| `PUT` | `/api/v1/admin/users/:id/status` | Manager+ | `{"status": "SUSPENDED"}` | Toggle account active/suspended |
| `GET` | `/api/v1/admin/audit-logs` | Admin+ | `?entity=booking&page=1` | Traceability audit trail |
| `GET` | `/api/v1/admin/audit-logs/:id` | Admin+ | *(None)* | Detailed audit log entry payload |
