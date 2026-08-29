import {
  PrismaClient,
  Role,
  UserStatus,
  TempleStatus,
  SlotStatus,
  AartiStatus,
  RoomStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// ==============================================================================
// 1. PRODUCTION-SAFE MASTER DATA SEED (NON-DESTRUCTIVE UPSERTS ONLY)
// ==============================================================================
export async function seedProductionMasterData(client: PrismaClient = prisma) {
  console.log("🔒 [PRODUCTION SEED] Ensuring master catalog without deleting data...");

  // 1. Ensure Super Admin Account exists
  const superAdmin = await client.user.upsert({
    where: { phone: "+919999999999" },
    update: {
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
    create: {
      phone: "+919999999999",
      email: "superadmin@temple.com",
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  // 2. Ensure Primary Temple exists
  let temple = await client.temple.findFirst({
    where: { name: "Sri Venkateswara Temple" },
  });

  if (!temple) {
    temple = await client.temple.create({
      data: {
        name: "Sri Venkateswara Temple",
        description: "Ancient temple dedicated to Lord Venkateswara",
        address: "Tirumala Hills",
        city: "Tirupati",
        state: "Andhra Pradesh",
        country: "India",
        pincode: "517504",
        latitude: 13.6833,
        longitude: 79.35,
        status: TempleStatus.ACTIVE,
        establishedYear: 300,
        contactPhone: "+918772263333",
        contactEmail: "info@tirumala.org",
      },
    });
  }

  // 3. Ensure Temple Information exists
  await client.templeInformation.upsert({
    where: { templeId: temple.id },
    update: {},
    create: {
      templeId: temple.id,
      history: "The temple has a rich history dating back to 300 AD...",
      architecture: "Dravidian style architecture with gold-plated dome",
      timings: "Open 24 hours for darshan",
      guidelines: "Traditional dress code required. No phones inside sanctum.",
      about: "One of the most visited temples in the world",
    },
  });

  // 4. Ensure Deities exist
  let mainDeity = await client.deity.findFirst({
    where: { templeId: temple.id, name: "Lord Venkateswara" },
  });
  if (!mainDeity) {
    mainDeity = await client.deity.create({
      data: {
        templeId: temple.id,
        name: "Lord Venkateswara",
        description: "Main deity of the temple",
        significance: "Incarnation of Lord Vishnu",
        displayOrder: 1,
        isActive: true,
      },
    });
  }

  let consortDeity = await client.deity.findFirst({
    where: { templeId: temple.id, name: "Goddess Lakshmi" },
  });
  if (!consortDeity) {
    consortDeity = await client.deity.create({
      data: {
        templeId: temple.id,
        name: "Goddess Lakshmi",
        description: "Consort of Lord Venkateswara",
        significance: "Goddess of wealth and prosperity",
        displayOrder: 2,
        isActive: true,
      },
    });
  }

  // 5. Ensure Aarti Schedules exist
  const aartis = [
    { name: "Suprabhatam", startTime: "03:00 AM", endTime: "04:00 AM", desc: "Awakening of the Lord" },
    { name: "Thomala Seva", startTime: "04:30 AM", endTime: "05:30 AM", desc: "Flower decoration" },
    { name: "Archana", startTime: "06:00 AM", endTime: "07:00 AM", desc: "Chanting of 1000 names" },
    { name: "Naivedyam", startTime: "12:00 PM", endTime: "12:30 PM", desc: "Food offering" },
    { name: "Sandhya Aarti", startTime: "06:30 PM", endTime: "07:30 PM", desc: "Evening lamp offering" },
    { name: "Ekanta Seva", startTime: "10:30 PM", endTime: "11:00 PM", desc: "Putting the Lord to rest" },
  ];

  for (let i = 0; i < aartis.length; i++) {
    const existing = await client.aartiSchedule.findFirst({
      where: { templeId: temple.id, name: aartis[i].name },
    });
    if (!existing) {
      await client.aartiSchedule.create({
        data: {
          templeId: temple.id,
          name: aartis[i].name,
          description: aartis[i].desc,
          startTime: aartis[i].startTime,
          endTime: aartis[i].endTime,
          displayOrder: i + 1,
          status: AartiStatus.ACTIVE,
        },
      });
    }
  }

  // 6. Ensure Donation Causes exist
  const causes = [
    { name: "Nitya Annadanam", slug: "nitya-annadanam", desc: "Free food distribution for devotees" },
    { name: "Goshala Maintenance", slug: "goshala-maintenance", desc: "Protection and care of sacred cows" },
    { name: "Temple Renovation & Heritage", slug: "temple-renovation", desc: "Preservation of ancient Mandir architecture" },
    { name: "Veda Patashala & Sanskrit", slug: "veda-patashala", desc: "Support Vedic education and student boarding" },
  ];

  for (const c of causes) {
    await client.donationCause.upsert({
      where: {
        templeId_slug: {
          templeId: temple.id,
          slug: c.slug,
        },
      },
      update: {
        name: c.name,
        description: c.desc,
      },
      create: {
        templeId: temple.id,
        name: c.name,
        slug: c.slug,
        description: c.desc,
        isActive: true,
      },
    });
  }

  // 7. Ensure Gurukul & Daily Dincharya exists
  const existingGurukul = await client.gurukul.findFirst({
    where: { templeId: temple.id },
  });

  if (!existingGurukul) {
    await client.gurukul.create({
      data: {
        templeId: temple.id,
        name: "Shree Neelkantheshwar Mahadev Ved Vedang Gurukulam",
        description: "Traditional Vedic Gurukul & Sant Ashram",
        about: "Vedic Gurukul dedicated to the preservation and teaching of Shukla Yajurveda, Vedang, and Sanskrit Shastras under the sacred lineage of Tapaswi Sant.",
        philosophy: "Sanatan Vedic Gurukul Parampara cultivating character, Dharma, and Shastric mastery.",
        admissionInfo: "Pravesh open for eligible students aged 8-14 years. Boarding, Vedic studies, Sanskrit grammar, and holistic discipline provided.",
        contactInfo: "gurukul@temple.org | +91 99999 99999",
        rules: "Strict adherence to daily Dincharya routine, Brahmacharya, Ahimsa, and traditional Vedic lifestyle.",
        isPublished: true,
        schedules: {
          create: [
            { activityName: "Pratah Smaran", description: "Morning awakening, Snan & Vedic Chanting", startTime: "04:00 AM", endTime: "05:30 AM", displayOrder: 1, isActive: true },
            { activityName: "First Class", description: "Veda Paath, Sandhya Vandanam & Sanskrit Grammar", startTime: "08:00 AM", endTime: "11:00 AM", displayOrder: 2, isActive: true },
            { activityName: "Second Class", description: "Shastra Adhyayan, Jyotish, Upanishads", startTime: "02:00 PM", endTime: "04:00 PM", displayOrder: 3, isActive: true },
            { activityName: "Sandhya Aarti", description: "Maha Aarti, Stotra Paath & Satsang", startTime: "06:00 PM", endTime: "07:30 PM", displayOrder: 4, isActive: true },
          ],
        },
      },
    });
  }

  // 8. Ensure Nitya Paath item exists
  const existingPaath = await client.paath.findFirst({
    where: { templeId: temple.id, title: "Shiva Tandava Stotram" },
  });
  if (!existingPaath) {
    await client.paath.create({
      data: {
        templeId: temple.id,
        title: "Shiva Tandava Stotram",
        sanskritText: "जटाटवीगलज्जलप्रवाहपावितस्थले गलेऽवलम्ब्य लम्बितां भुजङ्गतुङ्गमालिकाम्। डमड्डमड्डमड्डमन्निनादवड्डमर्वयं चकार चण्डताण्डवं तनोतु नः शिवः शिवम्॥",
        transliteration: "Jatatavigalajjala pravahapavitasthale Galeavalambya lambitam bhujangatungamalikam | Damad damad damad daman ninadavadamarvayam Chakara chandatandavam tanotu nah shivah shivam ||",
        hindiMeaning: "जिन शिव जी के सघन जटा रूपी वन से बहती हुई गंगा नदी की धाराएं उनके पवित्र कंठ को प्रक्षालित करती हैं, वे भगवान शिव हमारा कल्याण करें।",
        englishMeaning: "May Lord Shiva, whose neck is purified by the flow of water cascading from the forest of his matted hair, bless us with auspiciousness.",
        audioUrl: "https://assets.temple.org/audio/shiva_tandava.mp3",
        durationSeconds: 360,
        category: "Stotram",
        displayOrder: 1,
        isPublished: true,
      },
    });
  }

  console.log("✓ [PRODUCTION SEED] Master data safely initialized without modifying transactional data.");
  return { templeId: temple.id, superAdminId: superAdmin.id };
}

// ==============================================================================
// 2. DEVELOPMENT / TEST SEED WITH CLEAN RESET (BLOCKED IN PRODUCTION)
// ==============================================================================
export async function resetAndSeedDevelopmentData(client: PrismaClient = prisma) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: Destructive database reset and demo data seeding cannot be executed in production environment (NODE_ENV=production)!"
    );
  }

  console.log("🧹 Cleaning existing development data...");
  await client.paymentEvent.deleteMany();
  await client.payment.deleteMany();
  await client.jigyasa.deleteMany();
  await client.mahaprasadBooking.deleteMany();
  await client.mahaprasadSlot.deleteMany();
  await client.gurukulAdmission.deleteMany();
  await client.gurukulSchedule.deleteMany();
  await client.gurukul.deleteMany();
  await client.paath.deleteMany();
  await client.checkIn.deleteMany();
  await client.bookingAttendee.deleteMany();
  await client.booking.deleteMany();
  await client.accommodationBooking.deleteMany();
  await client.eventRegistration.deleteMany();
  await client.event.deleteMany();
  await client.prasadOrderItem.deleteMany();
  await client.prasadOrder.deleteMany();
  await client.address.deleteMany();
  await client.prasadProduct.deleteMany();
  await client.donationReceipt.deleteMany();
  await client.donation.deleteMany();
  await client.donationCause.deleteMany();
  await client.announcement.deleteMany();
  await client.notification.deleteMany();
  await client.crowdSnapshot.deleteMany();
  await client.auditLog.deleteMany();
  await client.room.deleteMany();
  await client.galleryItem.deleteMany();
  await client.media.deleteMany();
  await client.sevaSlot.deleteMany();
  await client.seva.deleteMany();
  await client.pujaSlot.deleteMany();
  await client.puja.deleteMany();
  await client.darshanSlot.deleteMany();
  await client.darshanSchedule.deleteMany();
  await client.aartiSchedule.deleteMany();
  await client.deity.deleteMany();
  await client.templeInformation.deleteMany();
  await client.staffAssignment.deleteMany();
  await client.temple.deleteMany();
  await client.refreshToken.deleteMany();
  await client.user.deleteMany();
  console.log("✅ Cleaned existing development data");

  // ============== USERS ==============
  console.log("👤 Creating users...");
  const superAdmin = await client.user.create({
    data: {
      phone: "+919999999999",
      email: "superadmin@temple.com",
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const admin = await client.user.create({
    data: {
      phone: "+918888888888",
      email: "admin@temple.com",
      name: "Temple Admin",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const manager = await client.user.create({
    data: {
      phone: "+917777777777",
      email: "manager@temple.com",
      name: "Temple Manager",
      role: Role.MANAGER,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const staff = await client.user.create({
    data: {
      phone: "+916666666666",
      email: "staff@temple.com",
      name: "Temple Staff",
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const devotee1 = await client.user.create({
    data: {
      phone: "+919876543210",
      email: "devotee1@example.com",
      name: "Rajesh Kumar",
      role: Role.DEVOTEE,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const devotee2 = await client.user.create({
    data: {
      phone: "+919876543211",
      email: "devotee2@example.com",
      name: "Priya Sharma",
      role: Role.DEVOTEE,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  // ============== TEMPLE ==============
  console.log("🏛️ Creating temple...");
  const temple = await client.temple.create({
    data: {
      name: "Sri Venkateswara Temple",
      description: "Ancient temple dedicated to Lord Venkateswara",
      address: "Tirumala Hills",
      city: "Tirupati",
      state: "Andhra Pradesh",
      country: "India",
      pincode: "517504",
      latitude: 13.6833,
      longitude: 79.35,
      status: TempleStatus.ACTIVE,
      establishedYear: 300,
      contactPhone: "+918772263333",
      contactEmail: "info@tirumala.org",
    },
  });

  // Assign staff, manager, admin to temple
  await client.staffAssignment.createMany({
    data: [
      { userId: admin.id, templeId: temple.id },
      { userId: manager.id, templeId: temple.id },
      { userId: staff.id, templeId: temple.id },
    ],
  });

  await client.templeInformation.create({
    data: {
      templeId: temple.id,
      history: "The temple has a rich history dating back to 300 AD...",
      architecture: "Dravidian style architecture with gold-plated dome",
      timings: "Open 24 hours for darshan",
      guidelines: "Traditional dress code required. No phones inside sanctum.",
      about: "One of the most visited temples in the world",
    },
  });

  // Deities
  const mainDeity = await client.deity.create({
    data: {
      templeId: temple.id,
      name: "Lord Venkateswara",
      description: "Main deity of the temple",
      significance: "Incarnation of Lord Vishnu",
      displayOrder: 1,
      isActive: true,
    },
  });

  await client.deity.create({
    data: {
      templeId: temple.id,
      name: "Goddess Lakshmi",
      description: "Consort of Lord Venkateswara",
      significance: "Goddess of wealth and prosperity",
      displayOrder: 2,
      isActive: true,
    },
  });

  // Darshan Schedules
  const today = new Date();
  for (let day = 0; day < 7; day++) {
    const schedule = await client.darshanSchedule.create({
      data: {
        templeId: temple.id,
        name: day === 0 || day === 6 ? "Weekend General Darshan" : "General Darshan",
        description: "General darshan for all devotees",
        dayOfWeek: day,
        startTime: "06:00 AM",
        endTime: "09:00 PM",
        maxCapacity: 500,
        isActive: true,
      },
    });

    const slotDate = new Date(today);
    slotDate.setDate(slotDate.getDate() + day);
    await client.darshanSlot.create({
      data: {
        scheduleId: schedule.id,
        date: slotDate,
        startTime: new Date(slotDate.setHours(6, 0, 0, 0)),
        endTime: new Date(slotDate.setHours(7, 0, 0, 0)),
        capacity: 500,
        bookedCount: 0,
        status: SlotStatus.ACTIVE,
      },
    });
  }

  // Aarti Schedules
  const aartis = [
    { name: "Suprabhatam", startTime: "03:00 AM", endTime: "04:00 AM", desc: "Awakening of the Lord" },
    { name: "Thomala Seva", startTime: "04:30 AM", endTime: "05:30 AM", desc: "Flower decoration" },
    { name: "Archana", startTime: "06:00 AM", endTime: "07:00 AM", desc: "Chanting of 1000 names" },
    { name: "Naivedyam", startTime: "12:00 PM", endTime: "12:30 PM", desc: "Food offering" },
    { name: "Sandhya Aarti", startTime: "06:30 PM", endTime: "07:30 PM", desc: "Evening lamp offering" },
    { name: "Ekanta Seva", startTime: "10:30 PM", endTime: "11:00 PM", desc: "Putting the Lord to rest" },
  ];

  for (let i = 0; i < aartis.length; i++) {
    await client.aartiSchedule.create({
      data: {
        templeId: temple.id,
        name: aartis[i].name,
        description: aartis[i].desc,
        startTime: aartis[i].startTime,
        endTime: aartis[i].endTime,
        displayOrder: i + 1,
        status: AartiStatus.ACTIVE,
      },
    });
  }

  // Pujas
  const pujas = [
    { name: "Kalyanotsavam", price: 50000, duration: 120, capacity: 50 },
    { name: "Sahasra Deepalankara Seva", price: 25000, duration: 60, capacity: 100 },
    { name: "Vasantotsavam", price: 15000, duration: 45, capacity: 200 },
    { name: "Arjitha Brahmotsavam", price: 10000, duration: 90, capacity: 75 },
    { name: "Unjal Seva", price: 5000, duration: 30, capacity: 150 },
  ];

  for (const puja of pujas) {
    const createdPuja = await client.puja.create({
      data: {
        templeId: temple.id,
        deityId: mainDeity.id,
        name: puja.name,
        description: `Sacred ${puja.name} offering to Lord Venkateswara`,
        pricePaise: puja.price,
        durationMinutes: puja.duration,
        defaultCapacity: puja.capacity,
        isActive: true,
      },
    });

    for (let i = 0; i < 7; i++) {
      const slotDate = new Date(today);
      slotDate.setDate(slotDate.getDate() + i);
      await client.pujaSlot.create({
        data: {
          pujaId: createdPuja.id,
          date: slotDate,
          startTime: new Date(slotDate.setHours(9, 0, 0, 0)),
          endTime: new Date(slotDate.setHours(11, 0, 0, 0)),
          capacity: puja.capacity,
          bookedCount: 0,
          status: SlotStatus.ACTIVE,
        },
      });
    }
  }

  // Sevas
  const sevas = [
    { name: "Suprabhata Seva", price: 12000, duration: 30, capacity: 100 },
    { name: "Thomala Seva", price: 28000, duration: 45, capacity: 50 },
    { name: "Archana Seva", price: 22000, duration: 30, capacity: 75 },
    { name: "Visesha Pooja", price: 60000, duration: 90, capacity: 30 },
  ];

  for (const seva of sevas) {
    const createdSeva = await client.seva.create({
      data: {
        templeId: temple.id,
        deityId: mainDeity.id,
        name: seva.name,
        description: `Devotional ${seva.name} ritual`,
        pricePaise: seva.price,
        durationMinutes: seva.duration,
        defaultCapacity: seva.capacity,
        isActive: true,
      },
    });

    for (let i = 0; i < 7; i++) {
      const slotDate = new Date(today);
      slotDate.setDate(slotDate.getDate() + i);
      await client.sevaSlot.create({
        data: {
          sevaId: createdSeva.id,
          date: slotDate,
          startTime: new Date(slotDate.setHours(5, 0, 0, 0)),
          endTime: new Date(slotDate.setHours(5, 30, 0, 0)),
          capacity: seva.capacity,
          bookedCount: 0,
          status: SlotStatus.ACTIVE,
        },
      });
    }
  }

  // Accommodation Rooms
  const roomTypes = [
    { type: "STANDARD", name: "Standard Non-AC Room", price: 50000, capacity: 2, count: 10 },
    { type: "DELUXE", name: "Deluxe AC Room", price: 100000, capacity: 3, count: 8 },
    { type: "SUITE", name: "VIP Suite", price: 250000, capacity: 4, count: 4 },
    { type: "DORMITORY", name: "Devotee Dormitory", price: 15000, capacity: 1, count: 20 },
  ];

  for (const rt of roomTypes) {
    for (let i = 1; i <= rt.count; i++) {
      await client.room.create({
        data: {
          templeId: temple.id,
          roomNumber: `${rt.type.slice(0, 3)}${i.toString().padStart(3, "0")}`,
          type: rt.type,
          pricePaise: rt.price,
          capacity: rt.capacity,
          amenities: rt.type === "SUITE" ? ["AC", "TV", "Geyser", "WiFi", "Room Service"] : ["Fan", "Attached Bath"],
          status: RoomStatus.AVAILABLE,
        },
      });
    }
  }

  // Prasad Catalog
  const prasadProducts = [
    { name: "Tirupati Laddu (Large)", desc: "World-famous GI-tagged Tirupati Laddu", price: 5000, stock: 1000 },
    { name: "Tirupati Laddu (Special)", desc: "Special Kalyanotsavam Laddu", price: 20000, stock: 200 },
    { name: "Vada Prasad", desc: "Traditional spiced black gram vada", price: 2500, stock: 500 },
    { name: "Chakkarapongal (Sweet Rice)", desc: "Sweet jaggery and rice prasad with ghee", price: 4000, stock: 300 },
  ];

  for (const p of prasadProducts) {
    await client.prasadProduct.create({
      data: {
        templeId: temple.id,
        name: p.name,
        description: p.desc,
        pricePaise: p.price,
        stock: p.stock,
        isActive: true,
      },
    });
  }

  // Donation Causes
  const causes = [
    { name: "Nitya Annadanam", slug: "nitya-annadanam", desc: "Free food distribution for devotees" },
    { name: "Goshala Maintenance", slug: "goshala-maintenance", desc: "Protection and care of sacred cows" },
    { name: "Temple Renovation & Heritage", slug: "temple-renovation", desc: "Preservation of ancient Mandir architecture" },
    { name: "Veda Patashala & Sanskrit", slug: "veda-patashala", desc: "Support Vedic education and student boarding" },
  ];

  for (const c of causes) {
    await client.donationCause.create({
      data: {
        templeId: temple.id,
        name: c.name,
        slug: c.slug,
        description: c.desc,
        isActive: true,
      },
    });
  }

  // Gurukul
  await client.gurukul.create({
    data: {
      templeId: temple.id,
      name: "Shree Neelkantheshwar Mahadev Ved Vedang Gurukulam",
      description: "Traditional Vedic Gurukul & Sant Ashram",
      about: "Vedic Gurukul dedicated to the preservation and teaching of Shukla Yajurveda, Vedang, and Sanskrit Shastras.",
      philosophy: "Sanatan Vedic Gurukul Parampara cultivating character, Dharma, and Shastric mastery.",
      admissionInfo: "Pravesh open for eligible students aged 8-14 years.",
      contactInfo: "gurukul@temple.org | +91 99999 99999",
      rules: "Strict adherence to daily Dincharya routine, Brahmacharya, Ahimsa, and traditional Vedic lifestyle.",
      isPublished: true,
      schedules: {
        create: [
          { activityName: "Pratah Smaran", description: "Morning awakening, Snan & Vedic Chanting", startTime: "04:00 AM", endTime: "05:30 AM", displayOrder: 1, isActive: true },
          { activityName: "First Class", description: "Veda Paath, Sandhya Vandanam & Sanskrit Grammar", startTime: "08:00 AM", endTime: "11:00 AM", displayOrder: 2, isActive: true },
          { activityName: "Second Class", description: "Shastra Adhyayan, Jyotish, Upanishads", startTime: "02:00 PM", endTime: "04:00 PM", displayOrder: 3, isActive: true },
          { activityName: "Sandhya Aarti", description: "Maha Aarti, Stotra Paath & Satsang", startTime: "06:00 PM", endTime: "07:30 PM", displayOrder: 4, isActive: true },
        ],
      },
    },
  });

  // Paath
  await client.paath.create({
    data: {
      templeId: temple.id,
      title: "Shiva Tandava Stotram",
      sanskritText: "जटाटवीगलज्जलप्रवाहपावितस्थले गलेऽवलम्ब्य लम्बितां भुजङ्गतुङ्गमालिकाम्। डमड्डमड्डमड्डमन्निनादवड्डमर्वयं चकार चण्डताण्डवं तनोतु नः शिवः शिवम्॥",
      transliteration: "Jatatavigalajjala pravahapavitasthale Galeavalambya lambitam bhujangatungamalikam | Damad damad damad daman ninadavadamarvayam Chakara chandatandavam tanotu nah shivah shivam ||",
      hindiMeaning: "जिन शिव जी के सघन जटा रूपी वन से बहती हुई गंगा नदी की धाराएं उनके पवित्र कंठ को प्रक्षालित करती हैं, वे भगवान शिव हमारा कल्याण करें।",
      englishMeaning: "May Lord Shiva, whose neck is purified by the flow of water cascading from the forest of his matted hair, bless us with auspiciousness.",
      audioUrl: "https://assets.temple.org/audio/shiva_tandava.mp3",
      durationSeconds: 360,
      category: "Stotram",
      displayOrder: 1,
      isPublished: true,
    },
  });

  // Mahaprasad Dining Slots
  for (let i = 0; i < 7; i++) {
    const slotDate = new Date(today);
    slotDate.setDate(slotDate.getDate() + i);

    await client.mahaprasadSlot.createMany({
      data: [
        {
          templeId: temple.id,
          sessionName: "Madhyahna Mahaprasad (Lunch)",
          date: slotDate,
          startTime: "12:00 PM",
          endTime: "02:30 PM",
          capacity: 150,
          bookedCount: 0,
          pricePerPersonPaise: 0,
          isActive: true,
        },
        {
          templeId: temple.id,
          sessionName: "Sandhya Mahaprasad (Dinner)",
          date: slotDate,
          startTime: "07:30 PM",
          endTime: "09:30 PM",
          capacity: 120,
          bookedCount: 0,
          pricePerPersonPaise: 0,
          isActive: true,
        },
      ],
    });
  }

  // Jigyasa Samadhan
  await client.jigyasa.create({
    data: {
      askerName: "Amit Verma",
      question: "What is the spiritual significance of lighting a Pancha Pradeep or Ghee Diya in the temple?",
      category: "Rituals & Traditions",
      answer: "Lighting a Ghee Diya represents the removal of the darkness of Tamas with the radiant light of Sattva.",
      answeredBy: "Acharya Vidyadhar",
      answeredAt: new Date(),
      status: "ANSWERED",
      isPublic: true,
    },
  });

  console.log("🎉 Development seed completed successfully!");
}

// ==============================================================================
// 3. MAIN ENTRY POINT
// ==============================================================================
export async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    await seedProductionMasterData(prisma);
  } else {
    await resetAndSeedDevelopmentData(prisma);
  }
}

// Execute if run directly from CLI (npx prisma db seed)
if (require.main === module) {
  main()
    .catch((e) => {
      console.error("❌ Seed execution failed:", e.message);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}