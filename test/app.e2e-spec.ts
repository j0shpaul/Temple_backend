import * as request from 'supertest';
import { app, prisma } from './setup-e2e';
import { SlotStatus, EventStatus } from '@prisma/client';

describe('Temple Digital Platform E2E Tests', () => {
  let devoteeToken: string;
  let adminToken: string;
  let devoteeId: string;
  let adminId: string;
  let testTempleId: string;
  let testPujaId: string;
  let testPujaSlotId: string;
  let testBookingId: string;
  let testEventId: string;
  let testDonationCauseId: string;
  let testRoomId: string;
  let testPrasadId: string;
  let testQrToken: string;

  const testDevoteePhone = '+919999988881';
  const testAdminPhone = '+919999988882';

  beforeAll(async () => {
    // 1. Create or ensure test temple
    let temple = await prisma.temple.findFirst();
    if (!temple) {
      temple = await prisma.temple.create({
        data: {
          name: 'Shree Siddhivinayak Temple',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400028',
          address: 'Prabhadevi',
        },
      });
    }
    testTempleId = temple.id;

    // 2. Setup a test puja and slot
    const puja = await prisma.puja.create({
      data: {
        templeId: testTempleId,
        name: 'Maha Ganapati Homam',
        pricePaise: 50100,
        durationMinutes: 60,
        isActive: true,
      },
    });
    testPujaId = puja.id;

    const slotDate = new Date();
    slotDate.setDate(slotDate.getDate() + 5);
    slotDate.setHours(0, 0, 0, 0);

    const slotStart = new Date(slotDate);
    slotStart.setHours(9, 0, 0, 0);
    const slotEnd = new Date(slotDate);
    slotEnd.setHours(10, 0, 0, 0);

    const slot = await prisma.pujaSlot.create({
      data: {
        pujaId: testPujaId,
        date: slotDate,
        startTime: slotStart,
        endTime: slotEnd,
        capacity: 10,
        bookedCount: 0,
        status: SlotStatus.ACTIVE,
      },
    });
    testPujaSlotId = slot.id;

    // 3. Setup a donation cause
    const cause = await prisma.donationCause.create({
      data: {
        templeId: testTempleId,
        name: 'Annadanam Seva',
        slug: 'annadanam-e2e-' + Date.now(),
        isActive: true,
      },
    });
    testDonationCauseId = cause.id;

    // 4. Setup a test event
    const eventStart = new Date(Date.now() + 86400000 * 2);
    const eventEnd = new Date(Date.now() + 86400000 * 3);
    const event = await prisma.event.create({
      data: {
        templeId: testTempleId,
        title: 'Ganesh Chaturthi Utsav',
        startDate: eventStart,
        endDate: eventEnd,
        capacity: 100,
        status: EventStatus.PUBLISHED,
      },
    });
    testEventId = event.id;

    // 5. Setup a room
    const room = await prisma.room.create({
      data: {
        templeId: testTempleId,
        roomNumber: 'E2E-101',
        type: 'STANDARD',
        pricePaise: 150000,
        capacity: 2,
        status: 'AVAILABLE',
      },
    });
    testRoomId = room.id;

    // 6. Setup a prasad item
    const prasad = await prisma.prasadProduct.create({
      data: {
        templeId: testTempleId,
        name: 'Modak Special Box',
        pricePaise: 25000,
        stock: 50,
        isActive: true,
      },
    });
    testPrasadId = prasad.id;
  });

  afterAll(async () => {
    try {
      if (testBookingId) {
        await prisma.checkIn.deleteMany({ where: { bookingId: testBookingId } });
        await prisma.payment.deleteMany({ where: { bookingId: testBookingId } });
        await prisma.bookingAttendee.deleteMany({ where: { bookingId: testBookingId } });
        await prisma.booking.deleteMany({ where: { id: testBookingId } });
      }
      if (testPujaSlotId) {
        await prisma.pujaSlot.deleteMany({ where: { id: testPujaSlotId } });
      }
      if (testPujaId) {
        await prisma.puja.deleteMany({ where: { id: testPujaId } });
      }
      if (testEventId) {
        await prisma.eventRegistration.deleteMany({ where: { eventId: testEventId } });
        await prisma.event.deleteMany({ where: { id: testEventId } });
      }
      if (testDonationCauseId) {
        await prisma.donation.deleteMany({ where: { causeId: testDonationCauseId } });
        await prisma.donationCause.deleteMany({ where: { id: testDonationCauseId } });
      }
      if (testRoomId) {
        await prisma.accommodationBooking.deleteMany({ where: { roomId: testRoomId } });
        await prisma.room.deleteMany({ where: { id: testRoomId } });
      }
      if (testPrasadId) {
        await prisma.prasadOrderItem.deleteMany({ where: { productId: testPrasadId } });
        await prisma.prasadProduct.deleteMany({ where: { id: testPrasadId } });
      }
      if (devoteeId) {
        await prisma.notification.deleteMany({ where: { userId: devoteeId } });
        await prisma.address.deleteMany({ where: { userId: devoteeId } });
        await prisma.refreshToken.deleteMany({ where: { userId: devoteeId } });
        await prisma.user.deleteMany({ where: { id: devoteeId } });
      }
      if (adminId) {
        await prisma.notification.deleteMany({ where: { userId: adminId } });
        await prisma.refreshToken.deleteMany({ where: { userId: adminId } });
        await prisma.user.deleteMany({ where: { id: adminId } });
      }
    } catch (e) {
      // Ignored
    }
  });

  // ==================== 1. Health Checks ====================
  describe('Health Endpoints', () => {
    it('GET /api/v1/health should return up status', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /api/v1/health/ready should return database and redis status', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.info.database.status).toBe('up');
      expect(res.body.info.redis.status).toBe('up');
    });
  });

  // ==================== 2. Authentication Flow ====================
  describe('Authentication Flow', () => {
    it('POST /api/v1/auth/send-otp sends OTP', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: testDevoteePhone });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/verify-otp authenticates and returns tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone: testDevoteePhone, otp: '123456' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();

      devoteeToken = res.body.data.tokens.accessToken;
      devoteeId = res.body.data.user.id;
    });

    it('creates admin user and acquires adminToken', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: testAdminPhone });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone: testAdminPhone, otp: '123456' });
      expect(res.status).toBe(200);
      adminId = res.body.data.user.id;

      // Escalate to ADMIN role in db
      await prisma.user.update({
        where: { id: adminId },
        data: { role: 'ADMIN', name: 'E2E Admin' },
      });

      // Send OTP again for second login to get new JWT with ADMIN role
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: testAdminPhone });

      const adminRes = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone: testAdminPhone, otp: '123456' });
      adminToken = adminRes.body.data.tokens.accessToken;
    });

    it('GET /api/v1/auth/profile returns logged-in user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${devoteeToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe(testDevoteePhone);
    });
  });

  // ==================== 3. Temples, Deities & Gallery ====================
  describe('Temples & Metadata', () => {
    it('GET /api/v1/temples returns temple list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/temples');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.temples || res.body.data)).toBe(true);
    });

    it('GET /api/v1/temples/:id returns temple details', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testTempleId);
    });

    it('GET /api/v1/temples/:id/deities returns deities list', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/deities`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/temples/:id/gallery returns gallery items', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/gallery`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== 4. Darshan & Aarti ====================
  describe('Darshan & Aarti Schedules', () => {
    it('GET /api/v1/temples/:id/darshan/schedules returns schedules', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/darshan/schedules`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/temples/:id/aarti returns aarti timings', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/aarti`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== 5. Puja Services & Slots ====================
  describe('Puja Services', () => {
    it('GET /api/v1/temples/:id/puja lists pujas', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/puja`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/temples/:id/puja/:pujaId returns specific puja', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/puja/${testPujaId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testPujaId);
    });
  });

  // ==================== 6. Bookings Lifecycle ====================
  describe('Bookings Lifecycle', () => {
    it('POST /api/v1/bookings/puja creates a puja booking', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings/puja')
        .set('Authorization', `Bearer ${devoteeToken}`)
        .send({
          templeId: testTempleId,
          pujaId: testPujaId,
          slotId: testPujaSlotId,
          quantity: 2,
          devoteeName: 'Ganesh Bhakt',
          devoteePhone: testDevoteePhone,
          attendees: [
            { name: 'Person 1', phone: '+919999988883' },
            { name: 'Person 2', phone: '+919999988884' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('PENDING_PAYMENT');
      expect(res.body.data.qrToken).toBeDefined();

      testBookingId = res.body.data.id;
      testQrToken = res.body.data.qrToken;
    });

    it('GET /api/v1/bookings/me returns user bookings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/me')
        .set('Authorization', `Bearer ${devoteeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const bookings = res.body.data.bookings || res.body.data;
      expect(bookings.some((b: any) => b.id === testBookingId)).toBe(true);
    });

    it('GET /api/v1/bookings/:id returns booking details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${devoteeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testBookingId);
    });

    it('POST /api/v1/payments/booking/:bookingId initiates Razorpay order for booking', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/payments/booking/${testBookingId}`)
        .set('Authorization', `Bearer ${devoteeToken}`);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.razorpayOrderId).toBeDefined();
    });

    it('POST /api/v1/bookings/:id/cancel cancels the booking and restores slot capacity', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${testBookingId}/cancel`)
        .set('Authorization', `Bearer ${devoteeToken}`)
        .send({ reason: 'Schedule changed' });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');

      // Verify slot count decreased
      const slot = await prisma.pujaSlot.findUnique({ where: { id: testPujaSlotId } });
      expect(slot?.bookedCount).toBe(0);
    });
  });

  // ==================== 7. Donations ====================
  describe('Donations', () => {
    it('GET /api/v1/temples/:id/donations/causes lists causes', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/donations/causes`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const causes = res.body.data;
      expect(causes.some((c: any) => c.id === testDonationCauseId)).toBe(true);
    });

    it('POST /api/v1/temples/:id/donations creates a donation order', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/temples/${testTempleId}/donations`)
        .set('Authorization', `Bearer ${devoteeToken}`)
        .send({
          causeId: testDonationCauseId,
          amountPaise: 100000,
          donorName: 'Test Devotee',
          message: 'Om Namah Shivaya',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.razorpayOrderId).toBeDefined();
    });
  });

  // ==================== 8. Prasad Items ====================
  describe('Prasad Offering', () => {
    it('GET /api/v1/temples/:id/prasad/products lists available prasad', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/prasad/products`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const prasads = res.body.data;
      expect(prasads.some((p: any) => p.id === testPrasadId)).toBe(true);
    });
  });

  // ==================== 9. Accommodation ====================
  describe('Accommodation', () => {
    it('GET /api/v1/temples/:id/accommodation/rooms lists rooms', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/accommodation/rooms`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/temples/:id/accommodation/availability checks room availability', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/temples/${testTempleId}/accommodation/availability`)
        .query({ checkIn: '2026-09-01', checkOut: '2026-09-03' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== 10. Events ====================
  describe('Events & Registrations', () => {
    let registrationId: string;

    it('GET /api/v1/temples/:id/events lists published events', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/temples/${testTempleId}/events`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const events = res.body.data.events || res.body.data;
      expect(events.some((e: any) => e.id === testEventId)).toBe(true);
    });

    it('POST /api/v1/temples/:id/events/:eventId/register registers user for event', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/temples/${testTempleId}/events/${testEventId}/register`)
        .set('Authorization', `Bearer ${devoteeToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.qrToken).toBeDefined();
      registrationId = res.body.data.id;
    });

    it('GET /api/v1/temples/:id/events/registrations/me returns user registrations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/temples/${testTempleId}/events/registrations/me`)
        .set('Authorization', `Bearer ${devoteeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const regs = res.body.data.registrations || res.body.data;
      expect(regs.some((r: any) => r.id === registrationId)).toBe(true);
    });
  });

  // ==================== 11. Notifications ====================
  describe('Notifications', () => {
    it('GET /api/v1/notifications/me returns user notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/me')
        .set('Authorization', `Bearer ${devoteeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/notifications/me/unread-count returns unread count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/me/unread-count')
        .set('Authorization', `Bearer ${devoteeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.count).toBe('number');
    });
  });

  // ==================== 12. QR Code Verification ====================
  describe('QR Code Verification', () => {
    it('GET /api/v1/qr/verify/:qrToken verifies QR code with STAFF+ role', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/qr/verify/${testQrToken}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entityType).toBe('BOOKING');
    });
  });

  // ==================== 13. Admin Dashboard & Crowd Status ====================
  describe('Admin Dashboard', () => {
    it('GET /api/v1/admin/temples/:templeId/crowd calculates real-time crowd metrics', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/temples/${testTempleId}/crowd`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.level).toBeDefined();
      expect(res.body.data.occupancyPct).toBeDefined();
      expect(res.body.data.breakdown).toBeDefined();
    });

    it('GET /api/v1/admin/users lists users for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeDefined();
    });

    it('GET /api/v1/admin/temples/:templeId/dashboard returns admin overview stats', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/temples/${testTempleId}/dashboard`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.today).toBeDefined();
    });
  });
});
