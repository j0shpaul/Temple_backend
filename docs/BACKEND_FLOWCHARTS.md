# TEMPLE DIGITAL PLATFORM — COMPLETE WORKFLOW FLOWCHARTS

This document provides exhaustive Mermaid state and sequence diagrams for all system workflows, payment lifecycles, and security filters.

---

## 1. Cashfree Payment State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING : Devotee creates order / booking
    PENDING --> SUCCESS : Cashfree Webhook / S2S Sync (PAID)
    PENDING --> FAILED : Gateway failure / Bank decline
    PENDING --> CANCELLED : Devotee drops checkout session
    SUCCESS --> REFUNDED : Admin triggers full refund
    SUCCESS --> PARTIALLY_REFUNDED : Admin triggers partial refund
    
    note right of PENDING
        Entity (Booking/Order/Donation) remains
        in PENDING_PAYMENT / PLACED / PENDING state
    end note

    note right of SUCCESS
        Entity fulfilled:
        - Booking -> CONFIRMED + QR
        - Donation -> SUCCESS + 80G Receipt
        - Prasad -> CONFIRMED + Stock Deduct
        - Accommodation -> CONFIRMED
    end note

    note right of FAILED
        Stock restored, reservation freed
    end note

    FAILED --> [*]
    CANCELLED --> [*]
    REFUNDED --> [*]
```

---

## 2. Request Security & Authorization Flow

```mermaid
flowchart TD
    InboundRequest["Incoming HTTP Request"] --> RateLimit["Global Throttler / Helmet Ingress"]
    RateLimit --> ExtractAuth{"Authorization Header Present?"}
    
    ExtractAuth -->|No| CheckPublic{"Is Endpoint Public?"}
    CheckPublic -->|Yes| ValidationPipe["ValidationPipe (whitelist: true, forbidNonWhitelisted: true)"]
    CheckPublic -->|No| Return401["401 Unauthorized (Missing Token)"]

    ExtractAuth -->|Yes| VerifyJWT{"Verify JWT Signature & Expiry"}
    VerifyJWT -->|Invalid / Expired| Return401Invalid["401 Unauthorized (Invalid / Expired Token)"]
    VerifyJWT -->|Valid| LookupUser{"Lookup User in DB / Cache"}

    LookupUser -->|Not Found / Inactive| Return401Inactive["401 Unauthorized (Inactive User)"]
    LookupUser -->|Active| RoleCheck{"Check @Roles() Metadata"}

    RoleCheck -->|Insufficient Role| Return403["403 Forbidden (Insufficient Permissions)"]
    RoleCheck -->|Permitted| ValidationPipe

    ValidationPipe -->|Validation Failed| Return400["400 Bad Request (Invalid DTO)"]
    ValidationPipe -->|Valid DTO| Controller["Controller Route Handler"]
    Controller --> Service["Domain Application Service"]
    Service --> OwnershipCheck{"Devotee Owns Resource?"}
    OwnershipCheck -->|No (IDOR Attempt)| Return404Or403["403 Forbidden / 404 Not Found"]
    OwnershipCheck -->|Yes| PrismaTx["Prisma Atomic Transaction"]
    PrismaTx --> Response200["200 OK / 201 Created (ApiResponseDto)"]
```

---

## 3. Sequence Diagrams (15 Complete User Journeys)

### Flow 1: Devotee Authentication (OTP Lifecycle)
```mermaid
sequenceDiagram
    autonumber
    actor Devotee
    participant API as AuthController
    participant Svc as AuthService
    participant Redis as Redis 7
    participant DB as PostgreSQL

    Devotee->>API: POST /api/v1/auth/send-otp { phone: "+919876543210" }
    API->>Svc: sendOtp()
    Svc->>Redis: SETEX otp:+919876543210 300 "123456"
    Svc-->>Devotee: 200 OK (OTP Sent)
    Devotee->>API: POST /api/v1/auth/verify-otp { phone, otp: "123456" }
    API->>Svc: verifyOtp()
    Svc->>Redis: GET otp:+919876543210
    Svc->>Redis: DEL otp:+919876543210
    Svc->>DB: findOrCreate User
    Svc->>DB: create RefreshToken (SHA-256 hash)
    Svc-->>Devotee: 200 OK { tokens: { accessToken, refreshToken }, user }
```

### Flow 2: Puja Booking Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Devotee
    participant API as BookingController
    participant Svc as BookingService
    participant Pay as PaymentService
    participant CF as Cashfree API
    participant DB as PostgreSQL

    Devotee->>API: POST /api/v1/bookings/puja { pujaId, slotId, quantity: 1 }
    API->>Svc: createPujaBooking()
    Svc->>DB: Atomic updateMany check bookedCount <= capacity - 1
    Svc->>DB: Create Booking (PENDING_PAYMENT)
    Svc-->>Devotee: 201 Created { bookingId, reference }
    Devotee->>Pay: POST /api/v1/payments/booking/:id
    Pay->>CF: createOrder { order_id, order_amount }
    CF-->>Pay: { order_id, payment_session_id }
    Pay->>DB: Create Payment (PENDING)
    Pay-->>Devotee: 201 Created { paymentSessionId }
```

### Flow 3: Seva Booking Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Devotee
    participant API as BookingController
    participant Svc as BookingService
    participant Pay as PaymentService
    participant DB as PostgreSQL

    Devotee->>API: POST /api/v1/bookings/seva { sevaId, slotId, quantity: 1 }
    API->>Svc: createSevaBooking()
    Svc->>DB: Check SevaSlot capacity & reserve
    Svc->>DB: Create Booking (PENDING_PAYMENT)
    Svc-->>Devotee: 201 Created { bookingId }
    Devotee->>Pay: POST /api/v1/payments/booking/:id
    Pay->>DB: Create Payment (PENDING)
    Pay-->>Devotee: 201 Created { paymentSessionId }
```

### Flow 4: Donation & 80G Tax Exemption
```mermaid
sequenceDiagram
    autonumber
    actor Donor
    participant API as DonationController
    participant Svc as DonationService
    participant Pay as PaymentService
    participant DB as PostgreSQL

    Donor->>API: POST /api/v1/temples/:id/donations { causeId, amountPaise: 50100, panNumber }
    API->>Svc: createDonation()
    Svc->>DB: Create Donation (PENDING)
    Svc->>Pay: createPaymentForDonation()
    Pay->>DB: Create Payment (PENDING)
    Pay-->>Donor: 201 Created { donationId, orderId, paymentSessionId }
```

### Flow 5: Prasad Order & Inventory Reservation
```mermaid
sequenceDiagram
    autonumber
    actor Devotee
    participant API as PrasadController
    participant Svc as PrasadService
    participant DB as PostgreSQL

    Devotee->>API: POST /api/v1/temples/:id/prasad/orders { items: [{ productId, quantity: 2 }] }
    API->>Svc: createOrder()
    Svc->>DB: $executeRaw UPDATE PrasadProduct SET reservedStock += 2 WHERE stock - reservedStock >= 2
    alt Stock Available
        Svc->>DB: Create PrasadOrder (PLACED)
        Svc-->>Devotee: 201 Created { orderId, paymentSessionId }
    else Out of Stock
        Svc-->>Devotee: 409 Conflict ("Insufficient stock")
    end
```

### Flow 6: Accommodation Booking & Overlap Protection
```mermaid
sequenceDiagram
    autonumber
    actor Devotee
    participant API as AccommodationController
    participant Svc as AccommodationService
    participant DB as PostgreSQL

    Devotee->>API: POST /api/v1/temples/:id/accommodation/bookings { roomId, checkIn, checkOut }
    API->>Svc: createBooking()
    Svc->>DB: Query overlapping bookings where status in [PENDING_PAYMENT, CONFIRMED, CHECKED_IN]
    alt Overlap Detected
        Svc-->>Devotee: 409 Conflict ("Room not available for these dates")
    else Available
        Svc->>DB: Create AccommodationBooking (PENDING_PAYMENT)
        Svc-->>Devotee: 201 Created { bookingId, paymentSessionId }
    end
```

### Flow 7: Mahaprasad Dining Booking
```mermaid
sequenceDiagram
    autonumber
    actor Devotee
    participant API as MahaprasadController
    participant Svc as MahaprasadService
    participant DB as PostgreSQL

    Devotee->>API: POST /api/v1/mahaprasad/book { slotId, numberOfPeople: 2 }
    API->>Svc: bookMahaprasad()
    Svc->>DB: updateMany MahaprasadSlot bookedCount += 2 WHERE bookedCount <= capacity - 2
    alt Capacity Available
        Svc->>DB: Create MahaprasadBooking (CONFIRMED) + generate QR Token
        Svc-->>Devotee: 201 Created { reference, qrToken }
    else Slot Full
        Svc-->>Devotee: 409 Conflict ("Not enough capacity in this slot")
    end
```

### Flow 8: Gurukul Admission Application & Approval
```mermaid
sequenceDiagram
    autonumber
    actor Parent
    participant API as GurukulController
    actor Admin
    participant AdminAPI as AdminGurukulController
    participant DB as PostgreSQL

    Parent->>API: POST /api/v1/gurukul/admissions { studentName, guardianName, phone }
    API->>DB: Create GurukulAdmission (status: PENDING)
    API-->>Parent: 201 Created { id, message: "Admission inquiry submitted" }
    Admin->>AdminAPI: GET /api/v1/admin/gurukul/admissions
    AdminAPI->>DB: findMany GurukulAdmission
    AdminAPI-->>Admin: 200 OK [Admissions List]
    Admin->>AdminAPI: PUT /api/v1/admin/gurukul/admissions/:id { status: APPROVED, adminNotes }
    AdminAPI->>DB: update status -> APPROVED
    AdminAPI-->>Admin: 200 OK
```

### Flow 9: Jigyasa Samadhan Privacy & Q&A
```mermaid
sequenceDiagram
    autonumber
    actor Devotee
    participant API as JigyasaController
    actor Scholar as Scholar/Admin
    participant AdminAPI as AdminJigyasaController
    participant DB as PostgreSQL

    Devotee->>API: POST /api/v1/jigyasa { askerName, askerPhone, question }
    API->>DB: Create Jigyasa (status: PENDING, isPublic: false)
    API-->>Devotee: 201 Created
    Scholar->>AdminAPI: PUT /api/v1/admin/jigyasa/:id/answer { answer, answeredBy }
    AdminAPI->>DB: update status -> ANSWERED
    Scholar->>AdminAPI: PUT /api/v1/admin/jigyasa/:id/publish { isPublic: true }
    AdminAPI->>DB: update isPublic -> true
    Devotee->>API: GET /api/v1/jigyasa
    API->>DB: findMany where isPublic: true (SELECT excludes askerPhone)
    API-->>Devotee: 200 OK [Published Q&A without phone numbers]
```

### Flow 10: Paath Publishing & Cache Invalidation
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant AdminAPI as AdminPaathController
    participant Svc as PaathService
    participant Redis as Redis 7
    participant DB as PostgreSQL
    actor Devotee
    participant PubAPI as PaathController

    Admin->>AdminAPI: POST /api/v1/admin/paath { title, sanskritText, hindiMeaning }
    AdminAPI->>DB: Create NityaPaath (isPublished: false)
    Admin->>AdminAPI: PUT /api/v1/admin/paath/:id/publish { isPublished: true }
    AdminAPI->>Svc: publish()
    Svc->>DB: update isPublished -> true
    Svc->>Redis: DEL page:paath
    AdminAPI-->>Admin: 200 OK
    Devotee->>PubAPI: GET /api/v1/paath
    PubAPI->>Redis: GET page:paath (Cache Miss)
    PubAPI->>DB: findMany NityaPaath where isPublished: true
    PubAPI->>Redis: SETEX page:paath 120 payload
    PubAPI-->>Devotee: 200 OK [Published Paath List]
```

### Flow 11: Admin User Role Management & RBAC
```mermaid
sequenceDiagram
    autonumber
    actor SuperAdmin
    participant API as UsersController
    participant Svc as UsersService
    participant DB as PostgreSQL

    SuperAdmin->>API: PUT /api/v1/users/:id/role { role: "MANAGER" }
    API->>Svc: updateRole()
    Svc->>DB: update User role -> MANAGER
    Svc->>DB: Create AuditLog entry
    Svc-->>SuperAdmin: 200 OK
```

### Flow 12: Cashfree Signed Webhook Handling
```mermaid
sequenceDiagram
    autonumber
    actor CF as Cashfree Webhook Engine
    participant API as PaymentController
    participant Svc as PaymentService
    participant DB as PostgreSQL

    CF->>API: POST /api/v1/payments/webhook (x-webhook-timestamp, x-webhook-signature)
    API->>Svc: handleWebhook()
    Svc->>Svc: Verify HMAC-SHA256(timestamp + rawBody)
    alt Invalid Signature
        Svc-->>CF: 400 Bad Request
    else Valid Signature
        Svc->>DB: Check PaymentEvent for duplicate eventId
        alt Already Processed
            Svc-->>CF: 200 OK (ALREADY_PROCESSED)
        else New Event
            Svc->>DB: $transaction: Payment -> SUCCESS, Fulfill Entity -> CONFIRMED, Log PaymentEvent
            Svc-->>CF: 200 OK (PROCESSED)
        end
    end
```

### Flow 13: Server-to-Server Payment Recovery
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant API as PaymentController
    participant Svc as PaymentService
    participant CF as Cashfree REST API
    participant DB as PostgreSQL

    Admin->>API: GET /api/v1/payments/:id/status
    API->>Svc: getPaymentStatus()
    Svc->>CF: GET /orders/:orderId
    CF-->>Svc: { order_status: "PAID", cf_payment_id: "cf_999" }
    Svc->>DB: $transaction: Payment -> SUCCESS, Entity -> CONFIRMED
    Svc-->>Admin: 200 OK { status: SUCCESS, state: SUCCESS }
```

### Flow 14: Payment Refund Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant API as PaymentController
    participant Svc as PaymentService
    participant CF as Cashfree REST API
    participant DB as PostgreSQL

    Admin->>API: POST /api/v1/payments/:id/refund { amountPaise: 50100, reason: "Cancelled Puja" }
    API->>Svc: refundPayment()
    Svc->>CF: POST /orders/:orderId/refunds { refund_amount, refund_id }
    CF-->>Svc: { refund_status: "SUCCESS" }
    Svc->>DB: $transaction: Payment -> REFUNDED, Entity -> CANCELLED
    Svc-->>Admin: 200 OK { status: REFUNDED }
```

### Flow 15: Gate Check-in & QR Verification
```mermaid
sequenceDiagram
    autonumber
    actor GateStaff
    participant API as QrController
    participant Svc as QrService
    participant DB as PostgreSQL

    GateStaff->>API: POST /api/v1/qr/validate { qrToken }
    API->>Svc: validateQrToken()
    Svc->>DB: findFirst Booking where qrToken = qrToken
    alt Valid & Unused
        Svc->>DB: create CheckIn record & update Booking status -> CHECKED_IN
        Svc-->>GateStaff: 200 OK { valid: true, devoteeName, bookingType }
    else Already Used
        Svc-->>GateStaff: 409 Conflict ("Ticket already scanned at [time]")
    else Invalid Token
        Svc-->>GateStaff: 404 Not Found ("Invalid QR token")
    end
```
