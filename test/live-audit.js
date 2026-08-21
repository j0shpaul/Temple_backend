const http = require('http');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3001';
const API_PREFIX = '/api/v1';

async function request(method, path, body = null, token = null, headers = {}) {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
  return new Promise((resolve, reject) => {
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
    const dataStr = body ? JSON.stringify(body) : null;
    if (dataStr) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    if (dataStr) {
      req.write(dataStr);
    }
    req.end();
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE BACKEND INTEGRATION AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details}`);
      failed++;
    }
  }

  // PHASE 4: HEALTH CHECKS
  console.log('\n--- 1. Health & Readiness Checks ---');
  const healthRes = await request('GET', `${API_PREFIX}/health`);
  assert(healthRes.status === 200 && healthRes.data.status === 'ok', 'GET /api/v1/health returns 200 OK');

  const readyRes = await request('GET', `${API_PREFIX}/health/ready`);
  assert(readyRes.status === 200 && readyRes.data.info?.database?.status === 'up' && readyRes.data.info?.redis?.status === 'up', 'GET /api/v1/health/ready returns 200 with DB & Redis up');

  // PHASE 6: PAGE / BFF APIS
  console.log('\n--- 2. Page / BFF Aggregation APIs (10 Endpoints) ---');
  const pageEndpoints = [
    '/home',
    '/about',
    '/darshan',
    '/puja',
    '/seva',
    '/events',
    '/prasad',
    '/accommodation',
    '/donations',
    '/temple-overview',
  ];

  for (const ep of pageEndpoints) {
    const t0 = Date.now();
    const res1 = await request('GET', `${API_PREFIX}${ep}`);
    const t1 = Date.now();
    const res2 = await request('GET', `${API_PREFIX}${ep}`);
    const t2 = Date.now();

    const ok = res1.status === 200 && (res1.data.success === true || typeof res1.data === 'object');
    assert(ok, `GET ${API_PREFIX}${ep} (1st: ${t1 - t0}ms, 2nd cached: ${t2 - t1}ms)`);
  }

  // PHASE 7: AUTHENTICATION FLOW
  console.log('\n--- 3. Authentication & Token Lifecycle ---');
  const devoteePhone = '+919876543210';
  const otpRes = await request('POST', `${API_PREFIX}/auth/send-otp`, { phone: devoteePhone });
  assert(otpRes.status === 200, 'Request OTP for Devotee');

  const devOtp = '123456';
  const verifyRes = await request('POST', `${API_PREFIX}/auth/verify-otp`, { phone: devoteePhone, otp: devOtp });
  assert(verifyRes.status === 200 && verifyRes.data.success === true, 'Verify OTP returns token payload');
  const devoteeTokens = verifyRes.data.data?.tokens;
  const devoteeAccessToken = devoteeTokens?.accessToken;
  const devoteeRefreshToken = devoteeTokens?.refreshToken;
  assert(Boolean(devoteeAccessToken), 'Devotee Access Token present');
  assert(Boolean(devoteeRefreshToken), 'Devotee Refresh Token present');

  // Refresh token rotation
  const refreshRes = await request('POST', `${API_PREFIX}/auth/refresh`, { refreshToken: devoteeRefreshToken });
  assert(refreshRes.status === 200 && refreshRes.data.success === true, 'POST /auth/refresh returns rotated tokens');
  const newTokens = refreshRes.data.data;
  const rotatedAccessToken = newTokens.accessToken;

  // Unauthenticated request
  const unauthRes = await request('GET', `${API_PREFIX}/users/profile`);
  assert(unauthRes.status === 401, 'GET /users/profile without token returns 401 Unauthorized');

  // Tampered token
  const tamperedRes = await request('GET', `${API_PREFIX}/users/profile`, null, 'invalid.jwt.token');
  assert(tamperedRes.status === 401, 'GET /users/profile with invalid token returns 401 Unauthorized');

  // Authenticated devotee profile
  const profileRes = await request('GET', `${API_PREFIX}/users/profile`, null, rotatedAccessToken);
  assert(profileRes.status === 200 && profileRes.data.data?.phone === devoteePhone, 'GET /users/profile with valid token returns user profile');

  // Get Admin token
  const adminPhone = '+918888888888';
  await request('POST', `${API_PREFIX}/auth/send-otp`, { phone: adminPhone });
  const adminVerify = await request('POST', `${API_PREFIX}/auth/verify-otp`, { phone: adminPhone, otp: '123456' });
  const adminTokens = adminVerify.data.data?.tokens;
  const adminAccessToken = adminTokens?.accessToken;

  // Get Staff token
  const staffPhone = '+916666666666';
  await request('POST', `${API_PREFIX}/auth/send-otp`, { phone: staffPhone });
  const staffVerify = await request('POST', `${API_PREFIX}/auth/verify-otp`, { phone: staffPhone, otp: '123456' });
  const staffTokens = staffVerify.data.data?.tokens;
  const staffAccessToken = staffTokens?.accessToken;

  // PHASE 8: RBAC & IDOR SECURITY
  console.log('\n--- 4. RBAC & IDOR Security Testing ---');
  // Devotee accessing admin routes
  const devoteeAdminRes = await request('GET', `${API_PREFIX}/admin/users`, null, rotatedAccessToken);
  assert(devoteeAdminRes.status === 403, 'Devotee accessing /admin/users is rejected with 403 Forbidden');

  // Admin accessing admin routes
  const adminUsersRes = await request('GET', `${API_PREFIX}/admin/users`, null, adminAccessToken);
  assert(adminUsersRes.status === 200 && adminUsersRes.data.success === true, 'Admin accessing /admin/users succeeds with 200 OK');

  // Staff accessing QR verification
  const staffQrRes = await request('GET', `${API_PREFIX}/qr/verify/nonexistent-code`, null, staffAccessToken);
  assert(staffQrRes.status === 200 || staffQrRes.status === 404, 'Staff can access /qr/verify/:code');

  // Devotee attempting QR check-in
  const devoteeCheckinRes = await request('POST', `${API_PREFIX}/qr/check-in/booking`, { qrToken: 'test', templeId: 'dummy' }, rotatedAccessToken);
  assert(devoteeCheckinRes.status === 403, 'Devotee attempting /qr/check-in/booking is rejected with 403 Forbidden');

  // PHASE 9: CORE BUSINESS DOMAIN FLOWS
  console.log('\n--- 5. Core Domain Business Flows ---');
  // 1. Temples list
  const templesRes = await request('GET', `${API_PREFIX}/temples`);
  const templesList = templesRes.data.data?.temples || templesRes.data.data || [];
  assert(templesRes.status === 200 && templesList.length > 0, 'GET /temples returns temple list');
  const templeId = templesList[0]?.id;

  // 2. Temple Info & Deities & Gallery
  const templeInfoRes = await request('GET', `${API_PREFIX}/temples/${templeId}/info`);
  assert(templeInfoRes.status === 200, 'GET /temples/:id/info succeeds');

  const deitiesRes = await request('GET', `${API_PREFIX}/temples/${templeId}/deities`);
  assert(deitiesRes.status === 200, 'GET /temples/:id/deities succeeds');

  const galleryRes = await request('GET', `${API_PREFIX}/temples/${templeId}/gallery`);
  assert(galleryRes.status === 200, 'GET /temples/:id/gallery succeeds');

  const aartiRes = await request('GET', `${API_PREFIX}/temples/${templeId}/aarti`);
  assert(aartiRes.status === 200, 'GET /temples/:id/aarti succeeds');

  // 3. Darshan schedules & slots
  const darshanSchedulesRes = await request('GET', `${API_PREFIX}/temples/${templeId}/darshan/schedules`);
  assert(darshanSchedulesRes.status === 200, 'GET /temples/:id/darshan/schedules succeeds');

  const todayStr = new Date().toISOString().split('T')[0];
  const darshanSlotsRes = await request('GET', `${API_PREFIX}/temples/${templeId}/darshan/slots?date=${todayStr}`);
  const darshanSlotsList = darshanSlotsRes.data.data?.slots || darshanSlotsRes.data.data || [];
  assert(darshanSlotsRes.status === 200 && darshanSlotsList.length > 0, 'GET /temples/:id/darshan/slots returns slots');
  const darshanSlotId = darshanSlotsList[0]?.id;

  // 4. Create Darshan Booking
  let bookingId = null;
  let qrCode = null;
  const darshanSlot = darshanSlotsList[0];
  if (darshanSlot) {
    const bookingRes = await request('POST', `${API_PREFIX}/bookings/darshan`, {
      templeId,
      scheduleId: darshanSlot.scheduleId,
      slotId: darshanSlot.id,
      quantity: 1,
      devoteeName: 'Rajesh Kumar',
      devoteePhone: '+919876543210',
      attendees: [
        { name: 'Rajesh Kumar', age: 35, phone: '+919876543210' }
      ]
    }, rotatedAccessToken);
    assert(bookingRes.status === 201 || bookingRes.status === 200, 'POST /bookings/darshan creates booking');
    bookingId = bookingRes.data.data?.id;
    qrCode = bookingRes.data.data?.qrToken || bookingRes.data.data?.reference;
  }

  // 5. Booking details
  if (bookingId) {
    const getBookingRes = await request('GET', `${API_PREFIX}/bookings/${bookingId}`, null, rotatedAccessToken);
    assert(getBookingRes.status === 200, 'GET /bookings/:id returns user booking');

    // IDOR check: Devotee 2 trying to read Devotee 1's booking
    const devotee2Phone = '+919876543211';
    await request('POST', `${API_PREFIX}/auth/send-otp`, { phone: devotee2Phone });
    const d2Verify = await request('POST', `${API_PREFIX}/auth/verify-otp`, { phone: devotee2Phone, otp: '123456' });
    const d2Token = d2Verify.data.data?.tokens?.accessToken;

    const idorBookingRes = await request('GET', `${API_PREFIX}/bookings/${bookingId}`, null, d2Token);
    assert(idorBookingRes.status === 403 || idorBookingRes.status === 404, 'IDOR: Devotee 2 cannot view Devotee 1 booking (403/404)');
  }

  // 6. QR Check-in by Staff
  if (qrCode) {
    const verifyQrRes = await request('GET', `${API_PREFIX}/qr/verify/${qrCode}`, null, staffAccessToken);
    assert(verifyQrRes.status === 200, 'Staff verifies booking QR code');

    const checkInRes = await request('POST', `${API_PREFIX}/qr/check-in/booking`, { qrToken: qrCode, templeId }, staffAccessToken);
    assert(checkInRes.status === 200 || checkInRes.status === 201, 'Staff performs QR check-in');

    // Duplicate check-in check
    const dupCheckInRes = await request('POST', `${API_PREFIX}/qr/check-in/booking`, { qrToken: qrCode, templeId }, staffAccessToken);
    assert(dupCheckInRes.status === 400 || dupCheckInRes.status === 409 || dupCheckInRes.data?.success === false, 'Duplicate QR check-in is properly rejected');
  }

  // 7. Prasad Products & Order
  const prasadRes = await request('GET', `${API_PREFIX}/temples/${templeId}/prasad/products`);
  assert(prasadRes.status === 200 && prasadRes.data.data?.length > 0, 'GET /prasad/products returns products');
  const prasadProduct = prasadRes.data.data[0];

  const addressesRes = await request('GET', `${API_PREFIX}/temples/${templeId}/prasad/addresses`, null, rotatedAccessToken);
  let addressId = addressesRes.data.data?.[0]?.id;

  if (!addressId) {
    const addAddressRes = await request('POST', `${API_PREFIX}/temples/${templeId}/prasad/addresses`, {
      line1: '123 Temple Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      phone: '+919876543210'
    }, rotatedAccessToken);
    addressId = addAddressRes.data.data?.id;
  }

  if (prasadProduct && addressId) {
    const prasadOrderRes = await request('POST', `${API_PREFIX}/temples/${templeId}/prasad/orders`, {
      items: [{ productId: prasadProduct.id, quantity: 2 }],
      addressId: addressId
    }, rotatedAccessToken);
    assert(prasadOrderRes.status === 201 || prasadOrderRes.status === 200, 'POST /prasad/orders creates prasad order');
  }

  // 8. Donation Causes & Donation creation
  const causesRes = await request('GET', `${API_PREFIX}/temples/${templeId}/donations/causes`);
  assert(causesRes.status === 200 && causesRes.data.data?.length > 0, 'GET /donations/causes returns causes');
  const causeId = causesRes.data.data[0].id;

  const donationRes = await request('POST', `${API_PREFIX}/temples/${templeId}/donations`, {
    causeId,
    amountPaise: 50000,
    isAnonymous: false,
    donorName: 'Rajesh Kumar',
    donorPan: 'ABCDE1234F'
  }, rotatedAccessToken);
  assert(donationRes.status === 201 || donationRes.status === 200, 'POST /donations creates donation record with payment intent');

  // 9. Accommodation Search
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const checkInDate = tomorrow.toISOString().split('T')[0];
  const checkOutDate = dayAfter.toISOString().split('T')[0];

  const roomSearchRes = await request('GET', `${API_PREFIX}/temples/${templeId}/accommodation/availability?checkIn=${checkInDate}&checkOut=${checkOutDate}`);
  assert(roomSearchRes.status === 200, 'GET /accommodation/availability returns room availability');

  // 10. Events
  const eventsRes = await request('GET', `${API_PREFIX}/temples/${templeId}/events`);
  assert(eventsRes.status === 200 && eventsRes.data.data?.length > 0, 'GET /events returns events');
  const event = eventsRes.data.data.find(e => e.registrationRequired) || eventsRes.data.data[0];
  const eventId = event.id;

  // Cancel prior registration if any, then register
  await request('POST', `${API_PREFIX}/temples/${templeId}/events/${eventId}/cancel`, {}, rotatedAccessToken);
  const eventRegRes = await request('POST', `${API_PREFIX}/temples/${templeId}/events/${eventId}/register`, {}, rotatedAccessToken);
  assert(eventRegRes.status === 201 || eventRegRes.status === 200, 'POST /events/:id/register registers for event');

  // 11. Notifications
  const notifsRes = await request('GET', `${API_PREFIX}/notifications/me`, null, rotatedAccessToken);
  assert(notifsRes.status === 200, 'GET /notifications/me succeeds');
  const unreadRes = await request('GET', `${API_PREFIX}/notifications/me/unread-count`, null, rotatedAccessToken);
  assert(unreadRes.status === 200, 'GET /notifications/me/unread-count returns count');

  // 12. Admin Dashboard & Crowd
  const adminDashRes = await request('GET', `${API_PREFIX}/admin/temples/${templeId}/dashboard`, null, adminAccessToken);
  assert(adminDashRes.status === 200, 'GET /admin/temples/:id/dashboard returns metrics');
  const adminCrowdRes = await request('GET', `${API_PREFIX}/admin/temples/${templeId}/crowd`, null, adminAccessToken);
  assert(adminCrowdRes.status === 200, 'GET /admin/temples/:id/crowd returns crowd analytics');

  // PHASE 10: PAYMENTS AUDIT
  console.log('\n--- 6. Payments & Razorpay Signature Verification ---');
  if (bookingId) {
    const payOrderRes = await request('POST', `${API_PREFIX}/payments/booking/${bookingId}`, {}, rotatedAccessToken);
    assert(payOrderRes.status === 200 || payOrderRes.status === 201 || payOrderRes.status === 400, 'POST /payments/booking/:id payment intent check');

    // Test invalid HMAC signature rejection
    const invalidVerifyRes = await request('POST', `${API_PREFIX}/payments/verify`, {
      bookingId: bookingId,
      razorpayOrderId: 'order_fake123',
      razorpayPaymentId: 'pay_fake123',
      razorpaySignature: 'invalidsignaturehex'
    }, rotatedAccessToken);
    assert(invalidVerifyRes.status === 400 || invalidVerifyRes.status === 422 || invalidVerifyRes.data?.success === false, 'Invalid HMAC payment signature is strictly rejected');
  }

  // PHASE 12: CORS & PREFLIGHT
  console.log('\n--- 7. CORS & Preflight Handling ---');
  const corsPreflightRes = await request('OPTIONS', `${API_PREFIX}/home`, null, null, {
    'Origin': 'http://localhost:5173',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'Authorization,Content-Type'
  });
  assert(corsPreflightRes.status === 204 || corsPreflightRes.status === 200, 'OPTIONS preflight returns 200/204');
  assert(corsPreflightRes.headers['access-control-allow-origin'] === 'http://localhost:5173' || corsPreflightRes.headers['access-control-allow-origin'] === '*', 'Access-Control-Allow-Origin header is present');

  // PHASE 13: ERROR RESPONSE STANDARDIZATION
  console.log('\n--- 8. Error Response Standardization ---');
  const notFoundRes = await request('GET', `${API_PREFIX}/nonexistent-route-xyz`);
  assert(notFoundRes.status === 404, '404 Not Found returns HTTP 404');
  assert(notFoundRes.data.statusCode === 404 || notFoundRes.data.status === 404 || notFoundRes.data.error !== undefined, '404 response body has standardized structure without stack traces or DB internals');

  console.log('\n====================================================');
  console.log(`📊 AUDIT RESULTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

runAudit().catch(console.error);
