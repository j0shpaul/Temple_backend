import * as request from 'supertest';
import { app, prisma } from './setup-e2e';

describe('Page-Level Aggregation APIs (BFF Layer) E2E', () => {
  let testTempleId: string;

  beforeAll(async () => {
    let temple = await prisma.temple.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!temple) {
      temple = await prisma.temple.create({
        data: {
          name: 'Shree Siddhivinayak Temple',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400028',
          address: 'Prabhadevi, Mumbai',
          contactPhone: '+912224223206',
          contactEmail: 'info@siddhivinayak.org',
          status: 'ACTIVE',
        },
      });
    }
    testTempleId = temple.id;

    // Ensure temple information exists
    await prisma.templeInformation.upsert({
      where: { templeId: testTempleId },
      update: {},
      create: {
        templeId: testTempleId,
        history: 'Founded in 1801 by Laxman Vithu and Deubai Patil.',
        architecture: 'Traditional Hindu Mandap architecture.',
        timings: '05:30 AM - 10:00 PM',
        guidelines: 'Devotees requested to dress traditionally.',
        about: 'One of the most revered Ganesha shrines in India.',
      },
    });

    // Ensure at least one cause exists
    const cause = await prisma.donationCause.findFirst({ where: { templeId: testTempleId } });
    if (!cause) {
      await prisma.donationCause.create({
        data: {
          templeId: testTempleId,
          name: 'Annadanam Seva',
          slug: 'annadanam-seva',
          description: 'Daily free meal distribution for devotees',
          isDefault: true,
        },
      });
    }

    // Ensure at least one prasad product exists
    const prasad = await prisma.prasadProduct.findFirst({ where: { templeId: testTempleId } });
    if (!prasad) {
      await prisma.prasadProduct.create({
        data: {
          templeId: testTempleId,
          name: 'Maha Modak Box (5 pcs)',
          pricePaise: 25000,
          stock: 100,
          reservedStock: 5,
        },
      });
    }
  });

  describe('GET /api/v1/home', () => {
    it('should return aggregated home page dataset', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/home?templeId=${testTempleId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.temple).toBeDefined();
      expect(res.body.data.temple.id).toBe(testTempleId);
      expect(res.body.data.hero).toBeInstanceOf(Array);
      expect(res.body.data.todayDarshan).toBeInstanceOf(Array);
      expect(res.body.data.todayAarti).toBeInstanceOf(Array);
      expect(res.body.data.featuredPuja).toBeInstanceOf(Array);
      expect(res.body.data.featuredSeva).toBeInstanceOf(Array);
      expect(res.body.data.upcomingEvents).toBeInstanceOf(Array);
      expect(res.body.data.announcements).toBeInstanceOf(Array);
      expect(res.body.data.featuredPrasad).toBeInstanceOf(Array);
    });

    it('should default to first active temple if templeId is omitted', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/home')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.temple.name).toBeDefined();
    });
  });

  describe('GET /api/v1/about', () => {
    it('should return aggregated about page dataset', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/about?templeId=${testTempleId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.temple).toBeDefined();
      expect(res.body.data.info.history).toBeDefined();
      expect(res.body.data.deities).toBeInstanceOf(Array);
      expect(res.body.data.gallery).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/darshan', () => {
    it('should return darshan availability and schedules', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/darshan?templeId=${testTempleId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.temple).toBeDefined();
      expect(res.body.data.selectedDate).toBeDefined();
      expect(res.body.data.schedules).toBeInstanceOf(Array);
      expect(res.body.data.slots).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/puja', () => {
    it('should return puja ceremony catalog with available slots', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/puja?templeId=${testTempleId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pujas).toBeInstanceOf(Array);
      expect(res.body.data.deities).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/seva', () => {
    it('should return seva offerings with available slots', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/seva?templeId=${testTempleId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sevas).toBeInstanceOf(Array);
      expect(res.body.data.deities).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/events', () => {
    it('should return paginated upcoming events', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/events?templeId=${testTempleId}&page=1&limit=5`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
    });
  });

  describe('GET /api/v1/prasad', () => {
    it('should return paginated prasad products with stock status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/prasad?templeId=${testTempleId}&page=1&limit=10`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/v1/accommodation', () => {
    it('should return room types and availability summary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accommodation?templeId=${testTempleId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.roomTypes).toBeInstanceOf(Array);
      expect(res.body.data.rules).toBeDefined();
    });
  });

  describe('GET /api/v1/donations', () => {
    it('should return donation causes and 80G tax info', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/donations?templeId=${testTempleId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.causes).toBeInstanceOf(Array);
      expect(res.body.data.taxExemption).toBeDefined();
      expect(res.body.data.suggestedAmountsPaise).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/temple-overview', () => {
    it('should return full temple identity snapshot', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/temple-overview?templeId=${testTempleId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.temple).toBeDefined();
      expect(res.body.data.timings).toBeDefined();
      expect(res.body.data.contact).toBeDefined();
      expect(res.body.data.location).toBeDefined();
      expect(res.body.data.gallery).toBeInstanceOf(Array);
    });
  });
});
