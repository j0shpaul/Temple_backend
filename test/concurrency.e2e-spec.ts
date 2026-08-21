import * as request from 'supertest';
import { app, prisma } from './setup-e2e';
import { SlotStatus } from '@prisma/client';

describe('Concurrency & Race-Condition Tests', () => {
  let testTempleId: string;
  let limitedSlotId: string;
  let limitedPujaId: string;
  let testDevotees: Array<{ token: string; id: string; phone: string }> = [];

  beforeAll(async () => {
    // 1. Setup temple
    let temple = await prisma.temple.findFirst();
    if (!temple) {
      temple = await prisma.temple.create({
        data: {
          name: 'Concurrent Test Temple',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          address: 'Shivaji Nagar',
        },
      });
    }
    testTempleId = temple.id;

    // 2. Setup puja with a slot of strict capacity = 2
    const puja = await prisma.puja.create({
      data: {
        templeId: testTempleId,
        name: 'Special Limited Puja',
        pricePaise: 10000,
        durationMinutes: 30,
        isActive: true,
      },
    });
    limitedPujaId = puja.id;

    const slotDate = new Date();
    slotDate.setDate(slotDate.getDate() + 10);
    slotDate.setHours(0, 0, 0, 0);

    const slotStart = new Date(slotDate);
    slotStart.setHours(10, 0, 0, 0);
    const slotEnd = new Date(slotDate);
    slotEnd.setHours(10, 30, 0, 0);

    const slot = await prisma.pujaSlot.create({
      data: {
        pujaId: limitedPujaId,
        date: slotDate,
        startTime: slotStart,
        endTime: slotEnd,
        capacity: 2,
        bookedCount: 0,
        status: SlotStatus.ACTIVE,
      },
    });
    limitedSlotId = slot.id;

    // 3. Register 5 concurrent devotees
    for (let i = 1; i <= 5; i++) {
      const phone = `+91999900000${i}`;
      await request(app.getHttpServer()).post('/api/v1/auth/send-otp').send({ phone });
      const verifyRes = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' });

      testDevotees.push({
        token: verifyRes.body.data.tokens.accessToken,
        id: verifyRes.body.data.user.id,
        phone,
      });
    }
  });

  afterAll(async () => {
    try {
      if (limitedSlotId) {
        await prisma.checkIn.deleteMany({ where: { booking: { slotId: limitedSlotId } } });
        await prisma.payment.deleteMany({ where: { booking: { slotId: limitedSlotId } } });
        await prisma.bookingAttendee.deleteMany({ where: { booking: { slotId: limitedSlotId } } });
        await prisma.booking.deleteMany({ where: { slotId: limitedSlotId } });
        await prisma.pujaSlot.deleteMany({ where: { id: limitedSlotId } });
      }
      if (limitedPujaId) {
        await prisma.puja.deleteMany({ where: { id: limitedPujaId } });
      }
      for (const dev of testDevotees) {
        await prisma.notification.deleteMany({ where: { userId: dev.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: dev.id } });
        await prisma.user.deleteMany({ where: { id: dev.id } });
      }
    } catch (e) {
      // Cleanup
    }
  });

  it('prevents overbooking when 5 concurrent users try to book a slot with capacity 2', async () => {
    // 5 concurrent requests, each asking for 1 seat on a slot of capacity 2
    const bookingPromises = testDevotees.map((devotee, index) => {
      return request(app.getHttpServer())
        .post('/api/v1/bookings/puja')
        .set('Authorization', `Bearer ${devotee.token}`)
        .send({
          templeId: testTempleId,
          pujaId: limitedPujaId,
          slotId: limitedSlotId,
          quantity: 1,
          devoteeName: `Devotee ${index + 1}`,
          devoteePhone: devotee.phone,
        });
    });

    const results = await Promise.all(bookingPromises);

    const successfulBookings = results.filter((res) => res.status === 201 && res.body.success === true);
    const failedBookings = results.filter((res) => res.status >= 400 || res.body.success === false);

    // Exactly 2 must succeed, 3 must be rejected
    expect(successfulBookings.length).toBe(2);
    expect(failedBookings.length).toBe(3);

    // Verify slot capacity in DB is exactly 2 booked
    const slot = await prisma.pujaSlot.findUnique({ where: { id: limitedSlotId } });
    expect(slot?.bookedCount).toBe(2);
  });

  it('handles simultaneous OTP generation without race condition', async () => {
    const concurrentPhone = '+919999000099';
    const otpPromises = [1, 2, 3, 4].map(() =>
      request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: concurrentPhone })
    );

    const results = await Promise.all(otpPromises);
    // All should return HTTP 200 without throwing 500 server crashes
    for (const res of results) {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });
});
