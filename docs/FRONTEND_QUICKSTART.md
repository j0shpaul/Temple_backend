# 🚀 Temple Digital Platform — Frontend Quickstart & Integration Guide

> **Backend Status**: Audit Verified & Production Ready  
> **Protocol**: HTTPS / RESTful JSON  
> **Interactive Swagger UI**: `http://localhost:3001/docs` (or deployed `https://<DOMAIN>/docs`)  
> **Base API URL**: `http://localhost:3001/api/v1` (or deployed `https://<DOMAIN>/api/v1`)  

---

## 1. Quick Reference & Base URLs

| Service | Local URL | Production Template |
|---|---|---|
| **Base API** | `http://localhost:3001/api/v1` | `https://<BACKEND_HOST>/api/v1` |
| **Interactive Swagger Docs** | `http://localhost:3001/docs` | `https://<BACKEND_HOST>/docs` |
| **OpenAPI JSON Spec** | `http://localhost:3001/docs-json` | `https://<BACKEND_HOST>/docs-json` |
| **Liveness Health Check** | `http://localhost:3001/api/v1/health` | `https://<BACKEND_HOST>/api/v1/health` |
| **Readiness Health Check** | `http://localhost:3001/api/v1/health/ready` | `https://<BACKEND_HOST>/api/v1/health/ready` |

---

## 2. Production Axios Setup (Copy & Paste)

Create `src/lib/api.ts` (or `src/services/api.js`):

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const BASE_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// 1. Attach JWT Bearer Access Token to every outgoing request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Automatic Refresh Token Rotation Interceptor on 401 Unauthorized
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/send-otp')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

      if (!refreshToken) {
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${BASE_API_URL}/auth/refresh`, {
          refreshToken,
        });

        // Response envelope: { success: true, data: { accessToken, refreshToken, expiresIn } }
        const { accessToken: newAccess, refreshToken: newRefresh } = refreshResponse.data.data;

        localStorage.setItem('access_token', newAccess);
        localStorage.setItem('refresh_token', newRefresh);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }
        processQueue(null, newAccess);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

---

## 3. Standard Response & Error Envelope

All API endpoints return standard response envelopes:

### Success Response Envelope (HTTP 200 / 201)
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}
```

### Error Response Envelope (HTTP 400 / 401 / 403 / 404 / 409 / 500)
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;       // e.g. "BadRequest", "Unauthorized", "Forbidden", "NotFound", "Conflict"
    message: string;    // Human-readable error message for user display
  };
}
```

---

## 4. Authentication Lifecycle (Passwordless OTP)

```
Devotee enters phone number
        ↓
POST /api/v1/auth/send-otp { "phone": "+919876543210" }
        ↓
Devotee receives SMS (or uses DEV_OTP `123456` in non-prod)
        ↓
POST /api/v1/auth/verify-otp { "phone": "+919876543210", "otp": "123456" }
        ↓
Receive { user, tokens: { accessToken, refreshToken, expiresIn } }
        ↓
Save `accessToken` and `refreshToken` in localStorage / SecureStorage
        ↓
Subsequent calls include `Authorization: Bearer <accessToken>`
        ↓
On 401 Unauthorized: Call POST /api/v1/auth/refresh { refreshToken }
```

### Authentication Functions:

```typescript
// 1. Send OTP
export async function sendOtp(phone: string) {
  const res = await api.post('/auth/send-otp', { phone });
  return res.data; // { success: true, data: { message: "OTP sent..." } }
}

// 2. Verify OTP
export async function verifyOtp(phone: string, otp: string) {
  const res = await api.post('/auth/verify-otp', { phone, otp });
  const { user, tokens } = res.data.data;
  localStorage.setItem('access_token', tokens.accessToken);
  localStorage.setItem('refresh_token', tokens.refreshToken);
  return { user, tokens };
}

// 3. Get User Profile
export async function getUserProfile() {
  const res = await api.get('/users/profile');
  return res.data.data; // { id, phone, email, name, role, addresses, ... }
}

// 4. Logout
export async function logout() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken });
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
```

---

## 5. High-Performance Page-Level / BFF Aggregation APIs

> **💡 Best Practice**: Instead of making 5–10 separate roundtrips to render a page, use the dedicated Page Aggregation endpoints. They are cached in Redis with high throughput and instant PostgreSQL fallback.

| Page / Screen | Endpoint | Query Parameters | Description |
|---|---|---|---|
| **Home Page** | `GET /api/v1/home` | - | Banner, today's darshan & aarti, featured pujas/sevas, events, announcements, prasad |
| **About Page** | `GET /api/v1/about` | - | Temple history, architecture, timings, rules, deities & photo gallery |
| **Darshan Page** | `GET /api/v1/darshan` | `date=YYYY-MM-DD` | Darshan schedules, today's aarti, active slot availability |
| **Puja Page** | `GET /api/v1/puja` | `deityId=...&date=YYYY-MM-DD` | Puja catalog with deity filters and date slot availability |
| **Seva Page** | `GET /api/v1/seva` | `deityId=...&date=YYYY-MM-DD` | Seva catalog with deity filters and date slot availability |
| **Events Page** | `GET /api/v1/events` | `page=1&limit=10` | Festivals, capacities, booked counts, registration status |
| **Prasad Page** | `GET /api/v1/prasad` | `page=1&limit=20` | Full prasad catalog, prices, live available stock |
| **Accommodation** | `GET /api/v1/accommodation` | `checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD` | Room types, pricing, amenities, live room availability |
| **Donations Page** | `GET /api/v1/donations` | - | Causes, 80G tax exemption details, default causes |
| **Temple Overview** | `GET /api/v1/temple-overview` | - | Full temple identity snapshot, contact, timings, location |

### Example Home Page Consumption:

```typescript
export async function fetchHomePageData() {
  const res = await api.get('/home');
  return res.data.data;
  /*
  {
    temple: { id, name, city, contactPhone, ... },
    todayDarshan: [ ... ],
    todayAarti: [ ... ],
    featuredPujas: [ ... ],
    featuredSevas: [ ... ],
    upcomingEvents: [ ... ],
    announcements: [ ... ],
    popularPrasad: [ ... ]
  }
  */
}
```

---

## 6. End-to-End Booking & Payment Flow

```
1. Devotee selects Puja/Seva/Darshan & Slot
                  ↓
2. POST /api/v1/bookings/puja (or seva / darshan)
   Receive booking record with reference and amountPaise
                  ↓
3. POST /api/v1/payments/booking/:bookingId
   Receive { razorpayOrderId, amountPaise, currency, keyId }
                  ↓
4. Open Razorpay Checkout Modal (SDK)
                  ↓
5. On Razorpay Success callback:
   POST /api/v1/payments/verify
   {
     bookingId,
     razorpayOrderId,
     razorpayPaymentId,
     razorpaySignature
   }
                  ↓
6. Backend verifies HMAC-SHA256 signature, confirms booking,
   and generates verified QR token for gate entry!
```

### Code Implementation:

```typescript
// 1. Create Puja Booking
export async function bookPuja(bookingData: {
  templeId: string;
  pujaId: string;
  slotId: string;
  quantity: number;
  devoteeName: string;
  devoteePhone: string;
  attendees: Array<{ name: string; age: number; phone?: string }>;
}) {
  const res = await api.post('/bookings/puja', bookingData);
  return res.data.data; // { id, reference, amountPaise, status: "PENDING_PAYMENT" }
}

// 2. Pay with Razorpay
export async function initiateAndPayBooking(bookingId: string) {
  // A. Create Razorpay order on backend
  const orderRes = await api.post(`/payments/booking/${bookingId}`);
  const { razorpayOrderId, amountPaise, currency, keyId } = orderRes.data.data;

  // B. Open Razorpay modal
  return new Promise((resolve, reject) => {
    const options = {
      key: keyId,
      amount: amountPaise,
      currency: currency || 'INR',
      name: 'Temple Digital Platform',
      description: 'Puja Booking Payment',
      order_id: razorpayOrderId,
      handler: async (response: any) => {
        try {
          // C. Verify signature on backend
          const verifyRes = await api.post('/payments/verify', {
            bookingId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          resolve(verifyRes.data.data);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled by user')),
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  });
}
```

---

## 7. QR Verification & Gate Check-in Flow (Staff & Manager)

Staff and Temple administrators use QR verification for physical gate check-in:

```typescript
// 1. Scan QR and verify pass details
export async function verifyScannedQR(qrToken: string) {
  const res = await api.get(`/qr/verify/${qrToken}`);
  return res.data.data;
  /*
  {
    valid: true,
    entityType: "BOOKING" | "EVENT_REGISTRATION" | "ACCOMMODATION_BOOKING",
    entityId: "...",
    data: { devoteeName, slotStartTime, attendees, status, ... }
  }
  */
}

// 2. Perform check-in (marks record as CHECKED_IN & records timestamp and gate)
export async function checkInBookingPass(qrToken: string, templeId: string) {
  const res = await api.post('/qr/check-in/booking', { qrToken, templeId });
  return res.data.data;
}

// 3. Event Check-in
export async function checkInEventPass(qrToken: string) {
  const res = await api.post('/qr/check-in/event', { qrToken });
  return res.data.data;
}
```

---

## 8. Prasad Ordering & Donation Flows

### Prasad Orders:
```typescript
// 1. Create Prasad Order
export async function placePrasadOrder(templeId: string, addressId: string, items: Array<{ productId: string; quantity: number }>) {
  const res = await api.post(`/temples/${templeId}/prasad/orders`, {
    templeId,
    addressId,
    items,
  });
  return res.data.data; // { order, razorpayOrderId, amountPaise, keyId }
}
```

### Donations:
```typescript
// 1. Make Donation
export async function makeDonation(templeId: string, donationData: {
  causeId: string;
  amountPaise: number;
  isAnonymous?: boolean;
  donorName?: string;
  message?: string;
}) {
  const res = await api.post(`/temples/${templeId}/donations`, donationData);
  return res.data.data; // { donationId, reference, razorpayOrderId, amountPaise, keyId }
}

// 2. Get 80G Donation Receipt
export async function getDonationReceipt(templeId: string, donationId: string) {
  const res = await api.get(`/temples/${templeId}/donations/${donationId}/receipt`);
  return res.data.data;
}
```

---

## 9. Role-Based Access Control (RBAC) Reference

| Role | Access Level | Endpoints Allowed |
|---|---|---|
| `DEVOTEE` | Standard User | Page APIs, public browsing, own bookings, orders, donations, addresses, notifications |
| `STAFF` | Temple Staff | All Devotee actions + QR scanning (`/qr/*`), user lookup, view temple bookings & orders |
| `MANAGER` | Temple Manager | All Staff actions + edit pujas, sevas, rooms, products, announcements, view reports |
| `ADMIN` | Temple Administrator | Full management over temple entities, user roles, refunds, audit logs, broadcasts |
| `SUPER_ADMIN` | Platform Super Admin | Cross-temple administration, global configuration |

---

## 10. CORS & Environment Checklist

- **Allowed Headers**: `Authorization`, `Content-Type`, `Accept`, `Origin`, `X-Requested-With`
- **Allowed Methods**: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`
- **Credentials**: `true` enabled
- **Local Dev URLs supported**: `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`, `*`
