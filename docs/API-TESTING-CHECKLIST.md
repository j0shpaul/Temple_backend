# Temple Digital Platform — API Testing Checklist

> **Interactive Master Checklist for Professor / QA Audit**  
> Covers all **217 implemented backend routes** across 25 functional domains.

---

## Testing Progress Overview
- [ ] **1. System & Health (3 Routes)**
- [ ] **2. Authentication & User Profile (7 Routes)**
- [ ] **3. User Account & Address Management (10 Routes)**
- [ ] **4. Temples & Metadata (5 Routes)**
- [ ] **5. Temple Extended Information (5 Routes)**
- [ ] **6. Deity Catalog (5 Routes)**
- [ ] **7. Gallery & Media Management (6 Routes)**
- [ ] **8. Darshan Schedules & Slot Availability (8 Routes)**
- [ ] **9. Aarti Timings & Schedules (7 Routes)**
- [ ] **10. Puja Ceremonies & Slot Booking (9 Routes)**
- [ ] **11. Seva Offerings & Reservations (9 Routes)**
- [ ] **12. Unified Booking Engine (10 Routes)**
- [ ] **13. Cashfree Payments & Webhooks (6 Routes)**
- [ ] **14. Donations & 80G Receipts (10 Routes)**
- [ ] **15. Prasad Catalog, Inventory & Delivery Orders (14 Routes)**
- [ ] **16. Accommodation & Guest House Rooms (13 Routes)**
- [ ] **17. Events, Festivals & Registrations (10 Routes)**
- [ ] **18. Notifications & User Preferences (12 Routes)**
- [ ] **19. Cryptographic QR Verification & Check-In (7 Routes)**
- [ ] **20. Paath (Nitya Paaths & Vedic Mantras) (7 Routes)**
- [ ] **21. Gurukul (Gurukulam Courses & Admissions) (11 Routes)**
- [ ] **22. Mahaprasad (Dining Halls & Mass Meal Slots) (8 Routes)**
- [ ] **23. Jigyasa Samadhan (Spiritual Q&A Forum) (8 Routes)**
- [ ] **24. Admin Core (Dashboard, Analytics & Audit) (16 Routes)**
- [ ] **25. BFF / Page Aggregation Layer (11 Routes)**

---

## Detailed Route-by-Route Checklist

### 1. Health (3 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/health` | `PUBLIC` | System health check (App, DB & Redis) |
| [ ] | `GET` | `/api/v1/api/v1/health/live` | `PUBLIC` | Application liveness probe |
| [ ] | `GET` | `/api/v1/api/v1/health/ready` | `PUBLIC` | Database and Redis readiness probe |

---

### 2. Auth (7 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `POST` | `/api/v1/api/v1/auth/send-otp` | `PUBLIC` | Send OTP to phone number |
| [ ] | `POST` | `/api/v1/api/v1/auth/verify-otp` | `PUBLIC` | Verify OTP and get access/refresh tokens |
| [ ] | `POST` | `/api/v1/api/v1/auth/refresh` | `PUBLIC` | Refresh access token using refresh token |
| [ ] | `POST` | `/api/v1/api/v1/auth/logout` | `DEVOTEE (Authenticated User)` | Logout and invalidate refresh token |
| [ ] | `GET` | `/api/v1/api/v1/auth/profile` | `DEVOTEE (Authenticated User)` | Get current user profile |
| [ ] | `POST` | `/api/v1/api/v1/auth/profile` | `DEVOTEE (Authenticated User)` | Update user profile |
| [ ] | `POST` | `/api/v1/api/v1/auth/complete-profile` | `DEVOTEE (Authenticated User)` | Complete user registration profile details |

---

### 3. Users (10 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/users` | `DEVOTEE (Authenticated User)` | List all users (admin/staff) |
| [ ] | `GET` | `/api/v1/api/v1/users/profile` | `DEVOTEE (Authenticated User)` | Get current user profile |
| [ ] | `GET` | `/api/v1/api/v1/users/me` | `DEVOTEE (Authenticated User)` | Get current user profile (alias) |
| [ ] | `PUT` | `/api/v1/api/v1/users/location` | `DEVOTEE (Authenticated User)` | Update current user location coordinates |
| [ ] | `GET` | `/api/v1/api/v1/users/{id}` | `DEVOTEE (Authenticated User)` | Get user by ID (admin/staff) |
| [ ] | `PUT` | `/api/v1/api/v1/users/{id}/role` | `DEVOTEE (Authenticated User)` | Update user role (admin only) |
| [ ] | `PUT` | `/api/v1/api/v1/users/{id}/status` | `DEVOTEE (Authenticated User)` | Update user status (admin only) |
| [ ] | `POST` | `/api/v1/api/v1/users/addresses` | `DEVOTEE (Authenticated User)` | Add address for current user |
| [ ] | `PUT` | `/api/v1/api/v1/users/addresses/{addressId}` | `DEVOTEE (Authenticated User)` | Update address |
| [ ] | `DELETE` | `/api/v1/api/v1/users/addresses/{addressId}` | `DEVOTEE (Authenticated User)` | Delete address |

---

### 4. Temple (5 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples` | `PUBLIC` | List all temples |
| [ ] | `POST` | `/api/v1/api/v1/temples` | `DEVOTEE (Authenticated User)` | Create temple (admin only) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{id}` | `PUBLIC` | Get temple by ID (public) |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{id}` | `DEVOTEE (Authenticated User)` | Update temple (admin only) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{id}` | `DEVOTEE (Authenticated User)` | Delete temple (admin only) |

---

### 5. Temple Info (5 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/info` | `PUBLIC` | Get temple information (public) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/info` | `DEVOTEE (Authenticated User)` | Create temple info (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/info/{id}` | `PUBLIC` | Get temple info by ID (public) |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/info/{id}` | `DEVOTEE (Authenticated User)` | Update temple info (staff+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/info/{id}` | `DEVOTEE (Authenticated User)` | Delete temple info (admin only) |

---

### 6. Deity (5 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/deities` | `PUBLIC` | List deities for a temple (public) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/deities` | `DEVOTEE (Authenticated User)` | Create deity (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/deities/{id}` | `PUBLIC` | Get deity by ID (public) |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/deities/{id}` | `DEVOTEE (Authenticated User)` | Update deity (staff+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/deities/{id}` | `DEVOTEE (Authenticated User)` | Delete deity (admin only) |

---

### 7. Gallery (6 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/gallery/presigned-url` | `DEVOTEE (Authenticated User)` | Generate pre-signed S3/Cloudinary upload signature/URL (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/gallery` | `PUBLIC` | List gallery items for a temple (public) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/gallery` | `DEVOTEE (Authenticated User)` | Create gallery item (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/gallery/{id}` | `PUBLIC` | Get gallery item by ID (public) |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/gallery/{id}` | `DEVOTEE (Authenticated User)` | Update gallery item (staff+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/gallery/{id}` | `DEVOTEE (Authenticated User)` | Delete gallery item (admin only) |

---

### 8. Darshan (8 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/darshan/schedules` | `PUBLIC` | List darshan schedules for a temple |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/darshan/schedules` | `DEVOTEE (Authenticated User)` | Create darshan schedule (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/darshan/schedules/{id}` | `PUBLIC` | Get darshan schedule by ID |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/darshan/schedules/{id}` | `DEVOTEE (Authenticated User)` | Update darshan schedule (staff+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/darshan/schedules/{id}` | `DEVOTEE (Authenticated User)` | Delete darshan schedule (admin only) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/darshan/slots` | `PUBLIC` | List darshan slots with availability |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/darshan/availability/{date}` | `PUBLIC` | Get darshan availability for a specific date |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/darshan/slots/{id}` | `DEVOTEE (Authenticated User)` | Update darshan slot capacity/status (staff+) |

---

### 9. Aarti (7 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/aarti` | `PUBLIC` | List aarti schedules for a temple |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/aarti` | `DEVOTEE (Authenticated User)` | Create aarti schedule (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/aarti/today` | `PUBLIC` | Get today's aarti schedule |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/aarti/upcoming` | `PUBLIC` | Get upcoming aarti schedules |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/aarti/{id}` | `PUBLIC` | Get aarti schedule by ID |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/aarti/{id}` | `DEVOTEE (Authenticated User)` | Update aarti schedule (staff+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/aarti/{id}` | `DEVOTEE (Authenticated User)` | Delete aarti schedule (admin only) |

---

### 10. Puja (9 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/puja` | `PUBLIC` | List puja services for a temple |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/puja` | `DEVOTEE (Authenticated User)` | Create puja service (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/puja/availability/{date}` | `PUBLIC` | Get puja availability for a specific date |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/puja/slots` | `PUBLIC` | List puja slots with availability |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/puja/slots` | `DEVOTEE (Authenticated User)` | Create puja slot (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/puja/{id}` | `PUBLIC` | Get puja service by ID |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/puja/{id}` | `DEVOTEE (Authenticated User)` | Update puja service (staff+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/puja/{id}` | `DEVOTEE (Authenticated User)` | Delete puja service (admin only) |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/puja/slots/{id}` | `DEVOTEE (Authenticated User)` | Update puja slot capacity/status (staff+) |

---

### 11. Seva (9 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/seva` | `PUBLIC` | List seva services for a temple |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/seva` | `DEVOTEE (Authenticated User)` | Create seva (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/seva/availability/{date}` | `PUBLIC` | Get seva availability for a specific date |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/seva/slots` | `PUBLIC` | List seva slots with availability |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/seva/slots` | `DEVOTEE (Authenticated User)` | Create seva slot (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/seva/{id}` | `PUBLIC` | Get seva by ID |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/seva/{id}` | `DEVOTEE (Authenticated User)` | Update seva (staff+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/seva/{id}` | `DEVOTEE (Authenticated User)` | Delete seva (admin only) |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/seva/slots/{id}` | `DEVOTEE (Authenticated User)` | Update seva slot capacity/status (staff+) |

---

### 12. Booking (10 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `POST` | `/api/v1/api/v1/bookings/puja` | `DEVOTEE (Authenticated User)` | Create puja booking |
| [ ] | `POST` | `/api/v1/api/v1/bookings/seva` | `DEVOTEE (Authenticated User)` | Create seva booking |
| [ ] | `POST` | `/api/v1/api/v1/bookings/darshan` | `DEVOTEE (Authenticated User)` | Create darshan booking (free, auto-confirmed) |
| [ ] | `GET` | `/api/v1/api/v1/bookings/me` | `DEVOTEE (Authenticated User)` | Get current user bookings |
| [ ] | `GET` | `/api/v1/api/v1/bookings/reference/{reference}` | `PUBLIC` | Get booking by reference (public) |
| [ ] | `GET` | `/api/v1/api/v1/bookings/{id}` | `DEVOTEE (Authenticated User)` | Get booking by ID |
| [ ] | `GET` | `/api/v1/api/v1/bookings/temple/{templeId}` | `DEVOTEE (Authenticated User)` | Get temple bookings (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/bookings/{id}/cancel` | `DEVOTEE (Authenticated User)` | Cancel booking |
| [ ] | `POST` | `/api/v1/api/v1/bookings/{id}/check-in` | `DEVOTEE (Authenticated User)` | Check in booking (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/bookings/verify-qr` | `PUBLIC` | Verify QR token (public for scanning) |

---

### 13. Payments (6 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `POST` | `/api/v1/api/v1/payments/booking/{bookingId}` | `DEVOTEE (Authenticated User)` | Create Cashfree payment order for booking |
| [ ] | `GET` | `/api/v1/api/v1/payments/{id}/status` | `DEVOTEE (Authenticated User)` | Reconcile / check authoritative payment status from gateway |
| [ ] | `POST` | `/api/v1/api/v1/payments/webhook` | `PUBLIC` | Cashfree webhook handler (public, signature-verified) |
| [ ] | `GET` | `/api/v1/api/v1/payments/me` | `DEVOTEE (Authenticated User)` | Get current user payments |
| [ ] | `GET` | `/api/v1/api/v1/payments/{id}` | `DEVOTEE (Authenticated User)` | Get payment by ID |
| [ ] | `POST` | `/api/v1/api/v1/payments/{id}/refund` | `DEVOTEE (Authenticated User)` | Refund payment (admin/manager only) |

---

### 14. Donations (10 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/donations/causes` | `PUBLIC` | List donation causes for a temple |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/donations/causes` | `DEVOTEE (Authenticated User)` | Create donation cause (staff+) |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/donations/causes/{id}` | `DEVOTEE (Authenticated User)` | Update donation cause (staff+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/donations/causes/{id}` | `DEVOTEE (Authenticated User)` | Delete donation cause (admin only) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/donations` | `DEVOTEE (Authenticated User)` | Create donation |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/donations` | `DEVOTEE (Authenticated User)` | Get temple donations (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/donations/verify` | `DEVOTEE (Authenticated User)` | Verify donation payment |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/donations/me` | `DEVOTEE (Authenticated User)` | Get current user donations |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/donations/{id}` | `DEVOTEE (Authenticated User)` | Get donation by ID |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/donations/{id}/receipt` | `DEVOTEE (Authenticated User)` | Get donation receipt |

---

### 15. Prasad (14 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/prasad/products` | `PUBLIC` | List prasad products for a temple |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/prasad/products` | `DEVOTEE (Authenticated User)` | Create prasad product (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/prasad/products/{id}` | `PUBLIC` | Get prasad product by ID |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/prasad/products/{id}` | `DEVOTEE (Authenticated User)` | Update prasad product (staff+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/prasad/products/{id}` | `DEVOTEE (Authenticated User)` | Delete prasad product (admin only) |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/prasad/products/{id}/stock` | `DEVOTEE (Authenticated User)` | Update prasad product stock (manager+) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/prasad/addresses` | `DEVOTEE (Authenticated User)` | Create address |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/prasad/addresses` | `DEVOTEE (Authenticated User)` | List user addresses |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/prasad/orders` | `DEVOTEE (Authenticated User)` | Create prasad order (checkout hold) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/prasad/orders` | `DEVOTEE (Authenticated User)` | Get temple orders (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/prasad/orders/verify` | `DEVOTEE (Authenticated User)` | Verify order payment |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/prasad/orders/me` | `DEVOTEE (Authenticated User)` | Get current user prasad orders |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/prasad/orders/{id}` | `DEVOTEE (Authenticated User)` | Get order by ID |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/prasad/orders/{id}/status` | `DEVOTEE (Authenticated User)` | Update order status (staff+) |

---

### 16. Accommodation (13 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/accommodation/rooms` | `PUBLIC` | List rooms for a temple |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/accommodation/rooms` | `DEVOTEE (Authenticated User)` | Create room (manager+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/accommodation/rooms/{id}` | `PUBLIC` | Get room by ID |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/accommodation/rooms/{id}` | `DEVOTEE (Authenticated User)` | Update room (manager+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/accommodation/rooms/{id}` | `DEVOTEE (Authenticated User)` | Delete room (admin only) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/accommodation/availability` | `PUBLIC` | Get room availability for date range |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/accommodation/book` | `DEVOTEE (Authenticated User)` | Create accommodation booking (hold room) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/accommodation/bookings/me` | `DEVOTEE (Authenticated User)` | Get current user accommodation bookings |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/accommodation/bookings/{id}` | `DEVOTEE (Authenticated User)` | Get booking by ID |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/accommodation/bookings` | `DEVOTEE (Authenticated User)` | Get temple bookings (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/accommodation/bookings/{id}/check-in` | `DEVOTEE (Authenticated User)` | Check in booking (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/accommodation/bookings/{id}/check-out` | `DEVOTEE (Authenticated User)` | Check out booking (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/accommodation/bookings/{id}/cancel` | `DEVOTEE (Authenticated User)` | Cancel booking |

---

### 17. Events (10 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/events` | `DEVOTEE (Authenticated User)` | Create event (manager+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/events` | `PUBLIC` | List events for a temple |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/events/{id}` | `PUBLIC` | Get event by ID |
| [ ] | `PUT` | `/api/v1/api/v1/temples/{templeId}/events/{id}` | `DEVOTEE (Authenticated User)` | Update event (manager+) |
| [ ] | `DELETE` | `/api/v1/api/v1/temples/{templeId}/events/{id}` | `DEVOTEE (Authenticated User)` | Delete event (admin only) |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/events/{id}/register` | `DEVOTEE (Authenticated User)` | Register for event |
| [ ] | `POST` | `/api/v1/api/v1/temples/{templeId}/events/{id}/cancel` | `DEVOTEE (Authenticated User)` | Cancel event registration |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/events/registrations/me` | `DEVOTEE (Authenticated User)` | Get my event registrations |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/events/{id}/registrations` | `DEVOTEE (Authenticated User)` | Get event registrations (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/temples/{templeId}/events/qr/verify/{qrToken}` | `STAFF / ADMIN / SUPER_ADMIN` | Verify QR token for check-in (staff+) |

---

### 18. Notifications (12 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/notifications/me` | `DEVOTEE (Authenticated User)` | Get my notifications |
| [ ] | `GET` | `/api/v1/api/v1/notifications/me/unread-count` | `DEVOTEE (Authenticated User)` | Get unread notification count |
| [ ] | `PUT` | `/api/v1/api/v1/notifications/me/{id}/read` | `DEVOTEE (Authenticated User)` | Mark notification as read |
| [ ] | `PUT` | `/api/v1/api/v1/notifications/me/read-all` | `DEVOTEE (Authenticated User)` | Mark all notifications as read |
| [ ] | `GET` | `/api/v1/api/v1/notifications/temples/{templeId}/announcements` | `PUBLIC` | List announcements for a temple |
| [ ] | `POST` | `/api/v1/api/v1/notifications/temples/{templeId}/announcements` | `DEVOTEE (Authenticated User)` | Create announcement (manager+) |
| [ ] | `GET` | `/api/v1/api/v1/notifications/temples/{templeId}/announcements/{id}` | `PUBLIC` | Get announcement by ID |
| [ ] | `PUT` | `/api/v1/api/v1/notifications/temples/{templeId}/announcements/{id}` | `DEVOTEE (Authenticated User)` | Update announcement (manager+) |
| [ ] | `DELETE` | `/api/v1/api/v1/notifications/temples/{templeId}/announcements/{id}` | `DEVOTEE (Authenticated User)` | Delete announcement (admin only) |
| [ ] | `POST` | `/api/v1/api/v1/notifications/temples/{templeId}/announcements/{id}/publish` | `DEVOTEE (Authenticated User)` | Publish announcement (manager+) |
| [ ] | `POST` | `/api/v1/api/v1/notifications/admin/send` | `ADMIN / SUPER_ADMIN` | Send notification to user (manager+) |
| [ ] | `POST` | `/api/v1/api/v1/notifications/admin/broadcast` | `ADMIN / SUPER_ADMIN` | Broadcast notification to all users (admin only) |

---

### 19. QR Verification (7 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/qr/verify/{qrToken}` | `STAFF / ADMIN / SUPER_ADMIN` | Verify QR token (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/qr/check-in/booking` | `DEVOTEE (Authenticated User)` | Check in booking via QR (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/qr/check-in/event` | `DEVOTEE (Authenticated User)` | Check in event registration via QR (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/qr/check-in/accommodation` | `DEVOTEE (Authenticated User)` | Check in accommodation via QR (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/qr/check-out/accommodation` | `DEVOTEE (Authenticated User)` | Check out accommodation via QR (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/qr/temples/{templeId}/regenerate/booking-qrs` | `DEVOTEE (Authenticated User)` | Regenerate missing booking QR codes (manager+) |
| [ ] | `POST` | `/api/v1/api/v1/qr/temples/{templeId}/regenerate/accommodation-qrs` | `DEVOTEE (Authenticated User)` | Regenerate missing accommodation QR codes (manager+) |

---

### 20. Paath (2 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/paath` | `PUBLIC` | List published Nitya Paath & Shlokas (public) |
| [ ] | `GET` | `/api/v1/api/v1/paath/{id}` | `PUBLIC` | Get single published Paath by ID (public) |

---

### 21. Paath Admin (5 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/admin/paath` | `ADMIN / SUPER_ADMIN` | List all Paath items including drafts (admin) |
| [ ] | `POST` | `/api/v1/api/v1/admin/paath` | `ADMIN / SUPER_ADMIN` | Create new Paath / Shloka content (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/paath/{id}` | `ADMIN / SUPER_ADMIN` | Update Paath content (admin) |
| [ ] | `DELETE` | `/api/v1/api/v1/admin/paath/{id}` | `ADMIN / SUPER_ADMIN` | Delete Paath content (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/paath/{id}/publish` | `ADMIN / SUPER_ADMIN` | Publish or unpublish Paath content (admin) |

---

### 22. Gurukul (3 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/gurukul` | `PUBLIC` | Get Gurukul identity, overview and daily schedule (public) |
| [ ] | `GET` | `/api/v1/api/v1/gurukul/dincharya` | `PUBLIC` | Get Gurukul Dincharya (daily routine schedule) (public) |
| [ ] | `POST` | `/api/v1/api/v1/gurukul/admissions` | `PUBLIC` | Submit Gurukul admission / Pravesh application (public) |

---

### 23. Gurukul Admin (8 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/admin/gurukul` | `ADMIN / SUPER_ADMIN` | Get Gurukul details with schedules & counts (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/gurukul/{id}` | `ADMIN / SUPER_ADMIN` | Update Gurukul overview and guidelines (admin) |
| [ ] | `GET` | `/api/v1/api/v1/admin/gurukul/admissions` | `ADMIN / SUPER_ADMIN` | List admission applications with filters (admin) |
| [ ] | `GET` | `/api/v1/api/v1/admin/gurukul/admissions/{id}` | `ADMIN / SUPER_ADMIN` | Get single admission application details (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/gurukul/admissions/{id}` | `ADMIN / SUPER_ADMIN` | Review and update admission status & notes (admin) |
| [ ] | `POST` | `/api/v1/api/v1/admin/gurukul/schedule` | `ADMIN / SUPER_ADMIN` | Create new Dincharya schedule entry (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/gurukul/schedule/{id}` | `ADMIN / SUPER_ADMIN` | Update Dincharya schedule entry (admin) |
| [ ] | `DELETE` | `/api/v1/api/v1/admin/gurukul/schedule/{id}` | `ADMIN / SUPER_ADMIN` | Delete Dincharya schedule entry (admin) |

---

### 24. Mahaprasad (3 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/mahaprasad/slots` | `PUBLIC` | List available Mahaprasad dining slots (public) |
| [ ] | `POST` | `/api/v1/api/v1/mahaprasad/book` | `PUBLIC` | Book Mahaprasad dining token/seats (public) |
| [ ] | `GET` | `/api/v1/api/v1/mahaprasad/booking/{reference}` | `PUBLIC` | Get Mahaprasad booking by reference (public) |

---

### 25. Mahaprasad Admin (5 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `POST` | `/api/v1/api/v1/admin/mahaprasad/slots` | `ADMIN / SUPER_ADMIN` | Create Mahaprasad dining slot (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/mahaprasad/slots/{id}` | `ADMIN / SUPER_ADMIN` | Update Mahaprasad dining slot (admin) |
| [ ] | `GET` | `/api/v1/api/v1/admin/mahaprasad/bookings` | `ADMIN / SUPER_ADMIN` | List Mahaprasad bookings with filters (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/mahaprasad/bookings/{id}/cancel` | `ADMIN / SUPER_ADMIN` | Cancel Mahaprasad booking & restore capacity (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/mahaprasad/bookings/{id}/checkin` | `ADMIN / SUPER_ADMIN` | Mark Mahaprasad devotee checked-in at dining hall (admin) |

---

### 26. Jigyasa Samadhan (2 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/jigyasa` | `PUBLIC` | List answered spiritual questions & explanations (public) |
| [ ] | `POST` | `/api/v1/api/v1/jigyasa` | `PUBLIC` | Submit spiritual inquiry / question (public) |

---

### 27. Jigyasa Admin (6 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/admin/jigyasa` | `ADMIN / SUPER_ADMIN` | List all questions including pending & drafts (admin) |
| [ ] | `GET` | `/api/v1/api/v1/admin/jigyasa/{id}` | `ADMIN / SUPER_ADMIN` | Get single question details (admin) |
| [ ] | `DELETE` | `/api/v1/api/v1/admin/jigyasa/{id}` | `ADMIN / SUPER_ADMIN` | Delete question (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/jigyasa/{id}/answer` | `ADMIN / SUPER_ADMIN` | Provide spiritual answer to question (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/jigyasa/{id}/publish` | `ADMIN / SUPER_ADMIN` | Set question public visibility (admin) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/jigyasa/{id}/reject` | `ADMIN / SUPER_ADMIN` | Reject inappropriate question (admin) |

---

### 28. Admin (16 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/admin/audit-logs` | `ADMIN / SUPER_ADMIN` | Get audit logs (admin+) |
| [ ] | `GET` | `/api/v1/api/v1/admin/audit-logs/{id}` | `ADMIN / SUPER_ADMIN` | Get audit log by ID (admin+) |
| [ ] | `GET` | `/api/v1/api/v1/admin/temples/{templeId}/crowd` | `ADMIN / SUPER_ADMIN` | Get crowd status for temple (staff+) |
| [ ] | `GET` | `/api/v1/api/v1/admin/temples/{templeId}/crowd/history` | `ADMIN / SUPER_ADMIN` | Get crowd history for temple (staff+) |
| [ ] | `POST` | `/api/v1/api/v1/admin/temples/{templeId}/crowd/snapshot` | `ADMIN / SUPER_ADMIN` | Record crowd snapshot (manager+) |
| [ ] | `GET` | `/api/v1/api/v1/admin/users` | `ADMIN / SUPER_ADMIN` | List users (manager+) |
| [ ] | `GET` | `/api/v1/api/v1/admin/users/{id}` | `ADMIN / SUPER_ADMIN` | Get user by ID (manager+) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/users/{id}/role` | `ADMIN / SUPER_ADMIN` | Update user role (admin+) |
| [ ] | `PUT` | `/api/v1/api/v1/admin/users/{id}/status` | `ADMIN / SUPER_ADMIN` | Update user status (manager+) |
| [ ] | `GET` | `/api/v1/api/v1/admin/temples/{templeId}/dashboard` | `ADMIN / SUPER_ADMIN` | Get dashboard stats for temple (manager+) |
| [ ] | `GET` | `/api/v1/api/v1/admin/temples/{templeId}/revenue` | `ADMIN / SUPER_ADMIN` | Get revenue report for temple (manager+) |
| [ ] | `POST` | `/api/v1/api/v1/admin/cleanup-expired-reservations` | `ADMIN / SUPER_ADMIN` | Release abandoned PENDING_PAYMENT reservations |
| [ ] | `POST` | `/api/v1/api/v1/admin/temples/{templeId}/staff` | `ADMIN / SUPER_ADMIN` | Assign staff/manager to a temple |
| [ ] | `GET` | `/api/v1/api/v1/admin/temples/{templeId}/staff` | `ADMIN / SUPER_ADMIN` | List staff assigned to a temple |
| [ ] | `DELETE` | `/api/v1/api/v1/admin/temples/{templeId}/staff/{userId}` | `ADMIN / SUPER_ADMIN` | Remove staff/manager from a temple |
| [ ] | `GET` | `/api/v1/api/v1/admin/users/{userId}/temples` | `ADMIN / SUPER_ADMIN` | List temples assigned to a user |

---

### 29. Pages (11 Endpoints)

| Status | Method | Endpoint Path | Role Required | Summary / Test Target |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | `GET` | `/api/v1/api/v1/home` | `PUBLIC` | Home Page Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/about` | `PUBLIC` | About Page Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/darshan` | `PUBLIC` | Darshan Page Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/puja` | `PUBLIC` | Puja Ceremonies Page Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/seva` | `PUBLIC` | Seva Offerings Page Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/events` | `PUBLIC` | Events Page Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/prasad` | `PUBLIC` | Prasad Catalog Page Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/accommodation` | `PUBLIC` | Accommodation Page Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/donations` | `PUBLIC` | Donations Page Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/temple-overview` | `PUBLIC` | Temple Overview Aggregation |
| [ ] | `GET` | `/api/v1/api/v1/maha-prasad` | `PUBLIC` | Mahaprasad Dining Page Aggregation |

---

## Verification & Sign-Off

- [ ] All 217 endpoints verified against running backend
- [ ] Devotee authentication and token refresh verified
- [ ] Admin RBAC and StaffAssignment multi-tenant isolation verified
- [ ] Cashfree payment order initiation and webhook verified
- [ ] Concurrency and double-booking protections verified
- [ ] QR code check-in cryptographic signature verified

**Tester Name:** ___________________________  
**Date of Audit:** ___________________________  
**Audit Outcome:** `PASSED / FAILED`
