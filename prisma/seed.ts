import { PrismaClient, Role, UserStatus, TempleStatus, SlotStatus, AartiStatus, EventStatus, RoomStatus, PaymentStatus, BookingStatus, AccommodationStatus, PrasadOrderStatus, DonationStatus, AnnouncementStatus, AnnouncementPriority, NotificationType, NotificationStatus, NotificationChannel, MediaType, MediaProvider, CrowdLevel } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...');
  await prisma.paymentEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.bookingAttendee.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.accommodationBooking.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.prasadOrderItem.deleteMany();
  await prisma.prasadOrder.deleteMany();
  await prisma.address.deleteMany();
  await prisma.prasadProduct.deleteMany();
  await prisma.donationReceipt.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.donationCause.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.crowdSnapshot.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.room.deleteMany();
  await prisma.galleryItem.deleteMany();
  await prisma.media.deleteMany();
  await prisma.sevaSlot.deleteMany();
  await prisma.seva.deleteMany();
  await prisma.pujaSlot.deleteMany();
  await prisma.puja.deleteMany();
  await prisma.darshanSlot.deleteMany();
  await prisma.darshanSchedule.deleteMany();
  await prisma.aartiSchedule.deleteMany();
  await prisma.deity.deleteMany();
  await prisma.templeInformation.deleteMany();
  await prisma.temple.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleaned existing data');

  // ============== USERS ==============
  console.log('👤 Creating users...');
  const superAdmin = await prisma.user.create({
    data: {
      phone: '+919999999999',
      email: 'superadmin@temple.com',
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      phone: '+918888888888',
      email: 'admin@temple.com',
      name: 'Temple Admin',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      phone: '+917777777777',
      email: 'manager@temple.com',
      name: 'Temple Manager',
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      phone: '+916666666666',
      email: 'staff@temple.com',
      name: 'Temple Staff',
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const devotee1 = await prisma.user.create({
    data: {
      phone: '+919876543210',
      email: 'devotee1@example.com',
      name: 'Rajesh Kumar',
      role: Role.DEVOTEE,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const devotee2 = await prisma.user.create({
    data: {
      phone: '+919876543211',
      email: 'devotee2@example.com',
      name: 'Priya Sharma',
      role: Role.DEVOTEE,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  console.log('✅ Users created');

  // ============== TEMPLE ==============
  console.log('🏛️ Creating temple...');
  const temple = await prisma.temple.create({
    data: {
      name: 'Sri Venkateswara Temple',
      description: 'Ancient temple dedicated to Lord Venkateswara',
      address: 'Tirumala Hills',
      city: 'Tirupati',
      state: 'Andhra Pradesh',
      country: 'India',
      pincode: '517504',
      latitude: 13.6833,
      longitude: 79.3500,
      status: TempleStatus.ACTIVE,
      establishedYear: 300,
      contactPhone: '+918772263333',
      contactEmail: 'info@tirumala.org',
    },
  });

  // Temple Information
  await prisma.templeInformation.create({
    data: {
      templeId: temple.id,
      history: 'The temple has a rich history dating back to 300 AD...',
      architecture: 'Dravidian style architecture with gold-plated dome',
      timings: 'Open 24 hours for darshan',
      guidelines: 'Traditional dress code required. No phones inside sanctum.',
      about: 'One of the most visited temples in the world',
    },
  });

  console.log('✅ Temple created');

  // ============== DEITIES ==============
  console.log('🕉️ Creating deities...');
  const mainDeity = await prisma.deity.create({
    data: {
      templeId: temple.id,
      name: 'Lord Venkateswara',
      description: 'Main deity of the temple',
      significance: 'Incarnation of Lord Vishnu',
      displayOrder: 1,
      isActive: true,
    },
  });

  await prisma.deity.create({
    data: {
      templeId: temple.id,
      name: 'Goddess Lakshmi',
      description: 'Consort of Lord Venkateswara',
      significance: 'Goddess of wealth and prosperity',
      displayOrder: 2,
      isActive: true,
    },
  });

  console.log('✅ Deities created');

  // ============== DARSHAN SCHEDULES ==============
  console.log('🕐 Creating darshan schedules...');
  const darshanSchedules = [];

  // Daily darshans
  for (let day = 0; day < 7; day++) {
    const schedule = await prisma.darshanSchedule.create({
      data: {
        templeId: temple.id,
        name: day === 0 || day === 6 ? 'Weekend General Darshan' : 'General Darshan',
        description: 'General darshan for all devotees',
        dayOfWeek: day,
        startTime: '06:00',
        endTime: '20:00',
        maxCapacity: 500,
        isSpecial: false,
        isActive: true,
        displayOrder: 1,
      },
    });
    darshanSchedules.push(schedule);
  }

  // Special darshans
  const specialDarshan = await prisma.darshanSchedule.create({
    data: {
      templeId: temple.id,
      name: 'VIP Darshan',
      description: 'Special darshan with reduced wait time',
      dayOfWeek: null, // Every day
      startTime: '05:00',
      endTime: '22:00',
      maxCapacity: 50,
      isSpecial: true,
      isActive: true,
      displayOrder: 0,
    },
  });
  darshanSchedules.push(specialDarshan);

  console.log('✅ Darshan schedules created');

  // Generate darshan slots for next 30 days
  console.log('📅 Generating darshan slots...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const slotDate = new Date(today);
    slotDate.setDate(slotDate.getDate() + dayOffset);
    const dayOfWeek = slotDate.getDay();

    for (const schedule of darshanSchedules) {
      if (schedule.dayOfWeek !== null && schedule.dayOfWeek !== dayOfWeek) continue;

      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      const slotDuration = 60; // 1 hour slots
      const numSlots = Math.floor(totalMinutes / slotDuration);

      for (let i = 0; i < numSlots; i++) {
        const slotStart = new Date(slotDate);
        slotStart.setHours(startHour + Math.floor((startMin + i * slotDuration) / 60));
        slotStart.setMinutes((startMin + i * slotDuration) % 60);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        await prisma.darshanSlot.create({
          data: {
            scheduleId: schedule.id,
            date: slotDate,
            startTime: slotStart,
            endTime: slotEnd,
            capacity: schedule.maxCapacity,
            bookedCount: 0,
            status: SlotStatus.ACTIVE,
          },
        });
      }
    }
  }

  console.log('✅ Darshan slots generated for 30 days');

  // ============== AARTI SCHEDULES ==============
  console.log('🕯️ Creating aarti schedules...');
  const aartiSchedules = [
    { name: 'Suprabhatam', startTime: '03:00', endTime: '03:30', isSpecial: false, displayOrder: 1 },
    { name: 'Thomala Seva', startTime: '03:30', endTime: '04:00', isSpecial: false, displayOrder: 2 },
    { name: 'Archana', startTime: '04:00', endTime: '04:30', isSpecial: false, displayOrder: 3 },
    { name: 'Sahasranama', startTime: '04:30', endTime: '05:00', isSpecial: false, displayOrder: 4 },
    { name: 'Ekantha Seva', startTime: '22:00', endTime: '22:30', isSpecial: false, displayOrder: 5 },
  ];

  for (const aarti of aartiSchedules) {
    await prisma.aartiSchedule.create({
      data: {
        templeId: temple.id,
        name: aarti.name,
        description: `Daily ${aarti.name}`,
        dayOfWeek: null,
        startTime: aarti.startTime,
        endTime: aarti.endTime,
        isSpecial: aarti.isSpecial,
        status: AartiStatus.ACTIVE,
        displayOrder: aarti.displayOrder,
      },
    });
  }

  console.log('✅ Aarti schedules created');

  // ============== PUJAS ==============
  console.log('🙏 Creating pujas...');
  const pujas = [
    { name: 'Sahasranama Archana', pricePaise: 25000, durationMinutes: 30, defaultCapacity: 1, displayOrder: 1 },
    { name: 'Lakshmi Kubera Puja', pricePaise: 50000, durationMinutes: 45, defaultCapacity: 2, displayOrder: 2 },
    { name: 'Navagraha Shanti', pricePaise: 75000, durationMinutes: 60, defaultCapacity: 4, displayOrder: 3 },
    { name: 'Vahana Puja', pricePaise: 10000, durationMinutes: 15, defaultCapacity: 1, displayOrder: 4 },
  ];

  for (const puja of pujas) {
    const created = await prisma.puja.create({
      data: {
        templeId: temple.id,
        deityId: mainDeity.id,
        name: puja.name,
        description: `Traditional ${puja.name}`,
        pricePaise: puja.pricePaise,
        durationMinutes: puja.durationMinutes,
        defaultCapacity: puja.defaultCapacity,
        isActive: true,
        displayOrder: puja.displayOrder,
      },
    });

    // Generate slots for next 14 days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const slotDate = new Date(today);
      slotDate.setDate(slotDate.getDate() + dayOffset);

      // Morning slots
      for (let hour = 6; hour < 12; hour += 2) {
        const slotStart = new Date(slotDate);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(slotEnd.getHours() + 1);

        await prisma.pujaSlot.create({
          data: {
            pujaId: created.id,
            date: slotDate,
            startTime: slotStart,
            endTime: slotEnd,
            capacity: puja.defaultCapacity,
            bookedCount: 0,
            status: SlotStatus.ACTIVE,
          },
        });
      }
    }
  }

  console.log('✅ Pujas and slots created');

  // ============== SEVAS ==============
  console.log('🪔 Creating sevas...');
  const sevas = [
    { name: 'Abhishekam', pricePaise: 15000, durationMinutes: 30, defaultCapacity: 2, displayOrder: 1 },
    { name: 'Alankaram', pricePaise: 20000, durationMinutes: 30, defaultCapacity: 2, displayOrder: 2 },
    { name: 'Nitya Kalyanam', pricePaise: 100000, durationMinutes: 60, defaultCapacity: 5, displayOrder: 3 },
    { name: 'Annadanam Sponsorship', pricePaise: 50000, durationMinutes: 120, defaultCapacity: 1, displayOrder: 4 },
  ];

  for (const seva of sevas) {
    const created = await prisma.seva.create({
      data: {
        templeId: temple.id,
        deityId: mainDeity.id,
        name: seva.name,
        description: `Sacred ${seva.name} service`,
        pricePaise: seva.pricePaise,
        durationMinutes: seva.durationMinutes,
        defaultCapacity: seva.defaultCapacity,
        isActive: true,
        displayOrder: seva.displayOrder,
      },
    });

    // Generate slots for next 14 days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const slotDate = new Date(today);
      slotDate.setDate(slotDate.getDate() + dayOffset);

      // Morning and evening slots
      for (const hour of [7, 10, 16, 19]) {
        const slotStart = new Date(slotDate);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(slotEnd.getHours() + (seva.durationMinutes / 60));

        await prisma.sevaSlot.create({
          data: {
            sevaId: created.id,
            date: slotDate,
            startTime: slotStart,
            endTime: slotEnd,
            capacity: seva.defaultCapacity,
            bookedCount: 0,
            status: SlotStatus.ACTIVE,
          },
        });
      }
    }
  }

  console.log('✅ Sevas and slots created');

  // ============== ROOMS ==============
  console.log('🏨 Creating rooms...');
  const roomTypes = [
    { type: 'DELUXE', count: 10, pricePaise: 500000, capacity: 4, floor: 1 },
    { type: 'PREMIUM', count: 20, pricePaise: 300000, capacity: 3, floor: 2 },
    { type: 'STANDARD', count: 30, pricePaise: 150000, capacity: 2, floor: 3 },
    { type: 'DORMITORY', count: 5, pricePaise: 50000, capacity: 8, floor: 4 },
  ];

  for (const rt of roomTypes) {
    for (let i = 1; i <= rt.count; i++) {
      await prisma.room.create({
        data: {
          templeId: temple.id,
          roomNumber: `${rt.type.substring(0, 2).toUpperCase()}-${rt.floor}${String(i).padStart(2, '0')}`,
          type: rt.type,
          capacity: rt.capacity,
          pricePaise: rt.pricePaise,
          status: RoomStatus.AVAILABLE,
          amenities: ['AC', 'WiFi', 'Hot Water', 'Attached Bathroom'],
          description: `${rt.type} room with modern amenities`,
          floor: rt.floor,
        },
      });
    }
  }

  console.log('✅ Rooms created');

  // ============== DONATION CAUSES ==============
  console.log('💝 Creating donation causes...');
  const causes = [
    { name: 'Annadanam', slug: 'annadanam', description: 'Free food for devotees', isDefault: true, displayOrder: 1 },
    { name: 'Temple Renovation', slug: 'renovation', description: 'Temple infrastructure development', isDefault: false, displayOrder: 2 },
    { name: 'Education Fund', slug: 'education', description: 'Support Vedic education', isDefault: false, displayOrder: 3 },
    { name: 'Medical Aid', slug: 'medical', description: 'Healthcare for poor devotees', isDefault: false, displayOrder: 4 },
    { name: 'Goshala', slug: 'goshala', description: 'Cow protection and care', isDefault: false, displayOrder: 5 },
  ];

  for (const cause of causes) {
    await prisma.donationCause.create({
      data: {
        templeId: temple.id,
        name: cause.name,
        slug: cause.slug,
        description: cause.description,
        isDefault: cause.isDefault,
        isActive: true,
        displayOrder: cause.displayOrder,
      },
    });
  }

  console.log('✅ Donation causes created');

  // ============== PRASAD PRODUCTS ==============
  console.log('🍯 Creating prasad products...');
  const prasadProducts = [
    { name: 'Laddu Prasadam', pricePaise: 5000, stock: 1000, displayOrder: 1 },
    { name: 'Vada Prasadam', pricePaise: 3000, stock: 500, displayOrder: 2 },
    { name: 'Pulihora', pricePaise: 4000, stock: 300, displayOrder: 3 },
    { name: 'Coconut Burfi', pricePaise: 6000, stock: 200, displayOrder: 4 },
    { name: 'Rava Kesari', pricePaise: 3500, stock: 400, displayOrder: 5 },
  ];

  for (const product of prasadProducts) {
    await prisma.prasadProduct.create({
      data: {
        templeId: temple.id,
        name: product.name,
        description: `Delicious ${product.name}`,
        pricePaise: product.pricePaise,
        stock: product.stock,
        reservedStock: 0,
        isActive: true,
        displayOrder: product.displayOrder,
      },
    });
  }

  console.log('✅ Prasad products created');

  // ============== EVENTS ==============
  console.log('🎉 Creating events...');
  const events = [
    {
      title: 'Brahmotsavam Festival',
      description: 'Annual 9-day grand festival with processions',
      imageUrl: 'https://example.com/brahmotsavam.jpg',
      location: 'Temple Complex',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
      capacity: 10000,
      registrationRequired: true,
      status: EventStatus.PUBLISHED,
    },
    {
      title: 'Vaikunta Ekadasi',
      description: 'Most auspicious day for Vishnu devotees',
      imageUrl: 'https://example.com/vaikunta.jpg',
      location: 'Main Temple',
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      capacity: 5000,
      registrationRequired: true,
      status: EventStatus.PUBLISHED,
    },
    {
      title: 'Rath Yatra',
      description: 'Chariot procession of the deities',
      imageUrl: 'https://example.com/rath.jpg',
      location: 'Temple Streets',
      startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      capacity: 15000,
      registrationRequired: false,
      status: EventStatus.PUBLISHED,
    },
  ];

  for (const event of events) {
    await prisma.event.create({
      data: {
        templeId: temple.id,
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        capacity: event.capacity,
        bookedCount: 0,
        registrationRequired: event.registrationRequired,
        status: event.status,
      },
    });
  }

  console.log('✅ Events created');

  // ============== ANNOUNCEMENTS ==============
  console.log('📢 Creating announcements...');
  await prisma.announcement.create({
    data: {
      templeId: temple.id,
      title: 'Temple Timings Updated',
      message: 'New darshan timings effective from next month. Please check website for details.',
      priority: AnnouncementPriority.IMPORTANT,
      status: AnnouncementStatus.PUBLISHED,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.announcement.create({
    data: {
      templeId: temple.id,
      title: 'Special Puja on Full Moon',
      message: 'Special Lakshmi Puja will be performed on full moon day. Registration opens next week.',
      priority: AnnouncementPriority.NORMAL,
      status: AnnouncementStatus.PUBLISHED,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Announcements created');

  // ============== ADDRESSES ==============
  console.log('📍 Creating addresses...');
  await prisma.address.create({
    data: {
      userId: devotee1.id,
      line1: '123 Temple Street',
      line2: 'Near Bus Stand',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      country: 'India',
      phone: '+919876543210',
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: devotee2.id,
      line1: '456 Devotee Lane',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      phone: '+919876543211',
      isDefault: true,
    },
  });

  console.log('✅ Addresses created');

  // ============== CROWD SNAPSHOTS ==============
  console.log('👥 Creating crowd snapshots...');
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const level = i % 3 === 0 ? CrowdLevel.HIGH : i % 3 === 1 ? CrowdLevel.MODERATE : CrowdLevel.LOW;
    const occupancy = level === CrowdLevel.HIGH ? 85 : level === CrowdLevel.MODERATE ? 55 : 25;

    await prisma.crowdSnapshot.create({
      data: {
        templeId: temple.id,
        date,
        level,
        occupancyPct: occupancy,
        estimatedCount: Math.floor(occupancy * 100),
        availableCapacity: Math.floor((100 - occupancy) * 100),
        source: 'computed',
      },
    });
  }

  console.log('✅ Crowd snapshots created');

  // ============== AUDIT LOGS ==============
  console.log('📋 Creating audit logs...');
  await prisma.auditLog.createMany({
    data: [
      { action: 'CREATE', entity: 'Temple', entityId: temple.id, metadata: { name: temple.name }, ipAddress: '127.0.0.1' },
      { action: 'CREATE', entity: 'User', entityId: superAdmin.id, metadata: { role: 'SUPER_ADMIN' }, ipAddress: '127.0.0.1' },
      { action: 'CREATE', entity: 'User', entityId: admin.id, metadata: { role: 'ADMIN' }, ipAddress: '127.0.0.1' },
      { action: 'LOGIN', entity: 'User', entityId: superAdmin.id, ipAddress: '127.0.0.1' },
    ],
  });

  console.log('✅ Audit logs created');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   Temple: ${temple.name}`);
  console.log(`   Users: ${[superAdmin, admin, manager, staff, devotee1, devotee2].length}`);
  console.log(`   Deities: 2`);
  console.log(`   Darshan Schedules: ${darshanSchedules.length}`);
  console.log(`   Aarti Schedules: ${aartiSchedules.length}`);
  console.log(`   Pujas: ${pujas.length}`);
  console.log(`   Sevas: ${sevas.length}`);
  console.log(`   Rooms: ${roomTypes.reduce((sum, rt) => sum + rt.count, 0)}`);
  console.log(`   Donation Causes: ${causes.length}`);
  console.log(`   Prasad Products: ${prasadProducts.length}`);
  console.log(`   Events: ${events.length}`);
  console.log(`   Announcements: 2`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });