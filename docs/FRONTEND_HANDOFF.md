# 🏛️ Temple Digital Platform — Frontend Developer Integration & Handoff Guide

> **Target Audience**: Frontend Web & Mobile Application Developers  
> **API Version**: `v1.0`  
> **Protocol**: HTTPS / RESTful JSON  
> **Interactive Documentation (Swagger)**: `https://<YOUR-DEPLOYED-BACKEND-URL>/docs` (Local: `http://localhost:3000/docs`)

---

## 🌐 1. Public & Testing Endpoints

| Resource | URL | Method / Description |
|---|---|---|
| **Base API URL** | `https://<YOUR-BACKEND-URL>/api/v1` | Root endpoint for all JSON API calls |
| **Interactive Swagger UI** | `https://<YOUR-BACKEND-URL>/docs` | Live testing console with schemas |
| **Liveness Health Check** | `https://<YOUR-BACKEND-URL>/api/v1/health` | `{"status":"ok","info":{"app":{"status":"up"}}}` |
| **Readiness Health Check** | `https://<YOUR-BACKEND-URL>/api/v1/health/ready` | `{"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}` |

---

## ⚡ 1.1 Fast Page-Level Read APIs (Recommended for Page Renders)

> **💡 Best Practice**: Instead of making 5-10 separate requests per page, use these page aggregation endpoints to fetch all required view data in 1 network roundtrip:

| Screen / Page | Endpoint | Description |
|---|---|---|
| **Home Screen** | `GET /api/v1/home` | Hero banner, today's darshan & aarti, featured pujas/sevas, events, announcements, and prasad |
| **About Screen** | `GET /api/v1/about` | Temple identity, history, architecture, timings, guidelines, deities & photo gallery |
| **Darshan Screen** | `GET /api/v1/darshan?date=YYYY-MM-DD` | Darshan schedules, today's aarti, and real-time slot availability |
| **Puja Screen** | `GET /api/v1/puja?deityId=...&date=YYYY-MM-DD` | Puja ceremonies catalog with deity filters and available slots |
| **Seva Screen** | `GET /api/v1/seva?deityId=...&date=YYYY-MM-DD` | Seva offerings catalog with deity filters and available slots |
| **Events Screen** | `GET /api/v1/events?page=1&limit=10` | Upcoming festivals, spots remaining, and registration status |
| **Prasad Screen** | `GET /api/v1/prasad?page=1&limit=20` | Prasad product catalog with stock status and images |
| **Accommodation** | `GET /api/v1/accommodation?checkIn=...&checkOut=...` | Room types, pricing, amenities, house rules & real-time room availability |
| **Donations Screen** | `GET /api/v1/donations` | Donation causes, 80G tax exemption info, suggested amounts |
| **Overview Screen** | `GET /api/v1/temple-overview` | Full temple identity snapshot with timings, contact, location & gallery |

*Note: Existing detailed resource APIs remain available for individual CRUD operations and mutations.*

---

## 📦 2. Standard API Response Structure

All API responses return a consistent JSON envelope:

### Successful Response (HTTP 200 / 201)
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "name": "Shree Siddhivinayak Temple"
  },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error Response (HTTP 400 / 401 / 403 / 404 / 409 / 500)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_ENOUGH_CAPACITY",
    "message": "Not enough capacity in this slot"
  }
}
```

---

## 🔐 3. Authentication & JWT Token Flow

Authentication is passwordless via phone number and OTP.

### Step 1: Request OTP
- **Endpoint**: `POST /api/v1/auth/send-otp`
- **Body**:
  ```json
  {
    "phone": "+919876543210"
  }
  ```
- **Response**: `{ "success": true, "data": { "message": "OTP sent to your phone number" } }`

> **Development/Testing Note**: When testing on non-production or test environments, the default OTP `123456` can be used.

---

### Step 2: Verify OTP & Receive Tokens
- **Endpoint**: `POST /api/v1/auth/verify-otp`
- **Body**:
  ```json
  {
    "phone": "+919876543210",
    "otp": "123456"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr_123",
        "phone": "+919876543210",
        "name": null,
        "role": "DEVOTEE",
        "isProfileComplete": false
      },
      "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "expiresIn": 900
      }
    }
  }
  ```

> **Frontend Routing Rule**: Check `user.isProfileComplete`:
> - If `isProfileComplete === false`: Redirect user to Profile Completion Screen (`POST /api/v1/auth/complete-profile`).
> - If `isProfileComplete === true`: Proceed directly to Home Screen.

---

### Step 3: Complete User Profile Onboarding (Post-OTP)
- **Endpoint**: `POST /api/v1/auth/complete-profile`
- **Header**: `Authorization: Bearer <accessToken>`
- **Body**:
  ```json
  {
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "dateOfBirth": "1990-01-15",
    "gender": "Male",
    "emergencyContact": "+919876543210"
  }
  ```
- **Response**: Returns updated user object with `isProfileComplete: true`.

---

### Step 4: Update User Geolocation Coordinates
- **Endpoint**: `PUT /api/v1/users/location`
- **Header**: `Authorization: Bearer <accessToken>`
- **Body**:
  ```json
  {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
  ```
- **Response**: `{ "success": true, "data": { "latitude": 28.6139, "longitude": 77.2090 } }`
- **Behavior**: Stores user coordinates. Nearby distance `distanceKm` will be returned in `/home` and `/temple-overview`. Location is strictly private and accessible only by the user or admins via RBAC.

---

### Step 3: Authenticating Subsequent Requests
Add the `accessToken` to the HTTP `Authorization` header:

```http
Authorization: Bearer eyJhbGciOi...
```

---

### Step 4: Refreshing Expired Access Tokens
When the backend returns HTTP `401 Unauthorized`:
- **Endpoint**: `POST /api/v1/auth/refresh`
- **Body**:
  ```json
  {
    "refreshToken": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
  ```
- **Response**: New `{ accessToken, refreshToken }` pair.

---

### Step 5: Logout
- **Endpoint**: `POST /api/v1/auth/logout` (Header: `Authorization: Bearer <accessToken>`)
- **Body**: `{ "refreshToken": "..." }`

---

## 🛕 4. Public Temple Browsing APIs (No Auth Required)

| Action | Endpoint | Description |
|---|---|---|
| **List Temples** | `GET /api/v1/temples` | List all active temples with addresses |
| **Temple Details** | `GET /api/v1/temples/:templeId` | Detailed temple profile |
| **Temple Info & History** | `GET /api/v1/temples/:templeId/info` | History, architecture, timings, rules |
| **Deities** | `GET /api/v1/temples/:templeId/deities` | Deities enshrined at temple |
| **Photo Gallery** | `GET /api/v1/temples/:templeId/gallery` | Photos with captions & categories |
| **Today's Aarti** | `GET /api/v1/temples/:templeId/aarti/today` | Current day's aarti schedule |
| **Darshan Schedules** | `GET /api/v1/temples/:templeId/darshan/schedules` | Regular & special darshan timings |
| **Darshan Availability** | `GET /api/v1/temples/:templeId/darshan/availability/:date` | Real-time slots & remaining spots (`YYYY-MM-DD`) |
| **Puja Ceremonies** | `GET /api/v1/temples/:templeId/puja` | Catalog of available puja services |
| **Puja Availability** | `GET /api/v1/temples/:templeId/puja/availability/:date` | Available slots for a specific date |
| **Seva Offerings** | `GET /api/v1/temples/:templeId/seva` | Catalog of seva offerings & pricing |
| **Events & Utsavs** | `GET /api/v1/temples/:templeId/events?upcoming=true` | Upcoming temple festivals |
| **Prasad Items** | `GET /api/v1/temples/:templeId/prasad/products` | Available prasad items & prices |
| **Donation Causes** | `GET /api/v1/temples/:templeId/donations/causes` | Causes (Annadanam, Goshala, etc.) |

---

## 🎟️ 5. Booking Flow (Puja, Seva, Darshan)

### 1. Create Puja Booking (Authenticated)
- **Endpoint**: `POST /api/v1/bookings/puja`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**:
  ```json
  {
    "templeId": "temple_id_here",
    "pujaId": "puja_id_here",
    "slotId": "slot_id_here",
    "quantity": 2,
    "devoteeName": "Ramesh Sharma",
    "devoteePhone": "+919876543210",
    "devoteeEmail": "ramesh@example.com",
    "attendees": [
      { "name": "Ramesh Sharma", "age": 42 },
      { "name": "Sita Sharma", "age": 38 }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "bk_123",
      "reference": "PJ-20260820-XXXX",
      "amountPaise": 100200,
      "status": "PENDING_PAYMENT",
      "qrToken": "qr_tok_abc123"
    }
  }
  ```

---

## 💳 6. Razorpay Payment Integration Flow

### Step 1: Initiate Razorpay Order
- **Endpoint**: `POST /api/v1/payments/booking/:bookingId`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "paymentId": "pmt_123",
      "razorpayOrderId": "order_OD12345678",
      "amountPaise": 100200,
      "currency": "INR",
      "keyId": "rzp_test_..."
    }
  }
  ```

### Step 2: Open Razorpay Modal on Frontend
```javascript
const options = {
  key: data.keyId,
  amount: data.amountPaise,
  currency: data.currency,
  name: "Temple Digital Platform",
  description: "Puja Ceremony Booking",
  order_id: data.razorpayOrderId,
  handler: async function (response) {
    // Send payment verification to backend
    await verifyPayment({
      bookingId: "bk_123",
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    });
  },
  prefill: {
    name: "Ramesh Sharma",
    contact: "+919876543210"
  }
};
const rzp = new window.Razorpay(options);
rzp.open();
```

### Step 3: Verify Payment
- **Endpoint**: `POST /api/v1/payments/verify`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**:
  ```json
  {
    "bookingId": "bk_123",
    "razorpayOrderId": "order_OD12345678",
    "razorpayPaymentId": "pay_PY12345678",
    "razorpaySignature": "computed_hmac_signature"
  }
  ```
- **Response**: Status updated to `SUCCESS`, booking status changed to `CONFIRMED`.

---

## 📱 7. QR Entry Verification Flow (Staff App)

1. Staff member logs in with staff credentials (`role: STAFF` or `ADMIN`).
2. Staff scans devotee's digital QR pass containing `qrToken`.
3. Call `GET /api/v1/qr/verify/:qrToken` to preview attendee and booking details.
4. Call `POST /api/v1/qr/check-in/booking` with `{ "qrToken": "...", "templeId": "..." }` to confirm check-in.

---

## 🛡️ 8. CORS & Cross-Origin Configuration

- By default in the free testing version, `CORS_ORIGINS=*` is enabled with credentials support.
- If testing from `http://localhost:5173` (Vite) or `http://localhost:3000` (Next.js), all requests with headers are supported out of the box.

---

## 💡 9. Sample Axios API Client (TypeScript)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://<YOUR-BACKEND-URL>/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatic token refresh interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data.data.tokens;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```
