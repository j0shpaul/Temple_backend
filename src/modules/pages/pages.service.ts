import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { TimezoneUtil } from "../../common/utils/timezone.util";

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (data) return JSON.parse(data);
    } catch {
      // Ignore cache fetch error
    }
    return null;
  }

  private async setCached(
    key: string,
    data: any,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch {
      // Ignore cache write error
    }
  }

  private async resolveTemple(templeId?: string) {
    if (templeId) {
      const temple = await this.prisma.temple.findUnique({
        where: { id: templeId },
        include: { info: true },
      });
      if (!temple) throw new NotFoundException("Temple not found");
      return temple;
    }
    const defaultTemple = await this.prisma.temple.findFirst({
      where: { status: "ACTIVE" },
      include: { info: true },
      orderBy: { createdAt: "asc" },
    });
    if (!defaultTemple) throw new NotFoundException("No active temple found");
    return defaultTemple;
  }

  // ==========================================
  // 1. HOME PAGE AGGREGATION
  // ==========================================
  async getHomePage(templeId?: string): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);
    const cacheKey = `page:home:${temple.id}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    const todayStart = TimezoneUtil.startOfDay();
    const todayEnd = TimezoneUtil.endOfDay();
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    const [
      galleryItems,
      darshanSchedules,
      aartis,
      pujas,
      sevas,
      events,
      announcements,
      prasadProducts,
    ] = await Promise.all([
      // Hero / Featured Gallery images
      this.prisma.galleryItem.findMany({
        where: { templeId: temple.id, isActive: true },
        take: 5,
        orderBy: { displayOrder: "asc" },
        include: { media: { select: { url: true, mediaType: true } } },
      }),
      // Today's Darshan Schedules
      this.prisma.darshanSchedule.findMany({
        where: {
          templeId: temple.id,
          isActive: true,
          OR: [
            { dayOfWeek: null, specificDate: null },
            { dayOfWeek },
            { specificDate: { gte: todayStart, lte: todayEnd } },
          ],
        },
        orderBy: { startTime: "asc" },
        include: {
          slots: {
            where: {
              date: { gte: todayStart, lte: todayEnd },
              status: "ACTIVE",
            },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              capacity: true,
              bookedCount: true,
            },
          },
        },
      }),
      // Today's Aarti Schedules
      this.prisma.aartiSchedule.findMany({
        where: { templeId: temple.id, status: "ACTIVE" },
        orderBy: { displayOrder: "asc" },
      }),
      // Featured Pujas
      this.prisma.puja.findMany({
        where: { templeId: temple.id, isActive: true },
        take: 6,
        orderBy: { name: "asc" },
        include: { deity: { select: { id: true, name: true } } },
      }),
      // Featured Sevas
      this.prisma.seva.findMany({
        where: { templeId: temple.id, isActive: true },
        take: 6,
        orderBy: { name: "asc" },
        include: { deity: { select: { id: true, name: true } } },
      }),
      // Upcoming Events
      this.prisma.event.findMany({
        where: {
          templeId: temple.id,
          status: "PUBLISHED",
          startDate: { gte: todayStart },
        },
        take: 4,
        orderBy: { startDate: "asc" },
      }),
      // Active Announcements
      this.prisma.announcement.findMany({
        where: {
          templeId: temple.id,
          status: "PUBLISHED",
          OR: [
            { startsAt: null, endsAt: null },
            { startsAt: { lte: today }, endsAt: { gte: today } },
            { startsAt: null, endsAt: { gte: today } },
            { startsAt: { lte: today }, endsAt: null },
          ],
        },
        take: 5,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      // Featured Prasad
      this.prisma.prasadProduct.findMany({
        where: { templeId: temple.id, isActive: true },
        take: 6,
        orderBy: { displayOrder: "asc" },
      }),
    ]);

    const homeData = {
      temple: {
        id: temple.id,
        name: temple.name,
        description: temple.description,
        address: temple.address,
        city: temple.city,
        state: temple.state,
        country: temple.country,
        pincode: temple.pincode,
        contactPhone: temple.contactPhone,
        contactEmail: temple.contactEmail,
        establishedYear: temple.establishedYear,
      },
      hero: galleryItems.map((item) => ({
        id: item.id,
        title: item.title,
        caption: item.caption,
        imageUrl: item.media?.url || null,
      })),
      todayDarshan: darshanSchedules.map((s: any) => ({
        id: s.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        isSpecial: s.isSpecial,
        availableSlots: (s.slots || []).map((sl: any) => ({
          id: sl.id,
          startTime: sl.startTime,
          endTime: sl.endTime,
          capacity: sl.capacity,
          bookedCount: sl.bookedCount,
          remaining: Math.max(0, sl.capacity - sl.bookedCount),
        })),
      })),
      todayAarti: aartis.map((a) => ({
        id: a.id,
        name: a.name,
        startTime: a.startTime,
        endTime: a.endTime,
        description: a.description,
        isSpecial: a.isSpecial,
      })),
      featuredPuja: pujas.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        pricePaise: p.pricePaise,
        durationMinutes: p.durationMinutes,
        deity: p.deity?.name || null,
      })),
      featuredSeva: sevas.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        pricePaise: s.pricePaise,
        durationMinutes: s.durationMinutes,
        deity: s.deity?.name || null,
      })),
      upcomingEvents: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
        imageUrl: e.imageUrl,
        location: e.location,
      })),
      announcements: announcements.map((an) => ({
        id: an.id,
        title: an.title,
        message: an.message,
        priority: an.priority,
        startsAt: an.startsAt,
        endsAt: an.endsAt,
      })),
      featuredPrasad: prasadProducts.map((pr) => ({
        id: pr.id,
        name: pr.name,
        description: pr.description,
        pricePaise: pr.pricePaise,
        imageUrl: pr.imageUrl,
        inStock: pr.stock - pr.reservedStock > 0,
      })),
    };

    await this.setCached(cacheKey, homeData, 60);
    return ApiResponseDto.success(homeData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // 2. ABOUT PAGE AGGREGATION
  // ==========================================
  async getAboutPage(templeId?: string): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);
    const cacheKey = `page:about:${temple.id}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    const [deities, gallery] = await Promise.all([
      this.prisma.deity.findMany({
        where: { templeId: temple.id, isActive: true },
        orderBy: { displayOrder: "asc" },
        select: { id: true, name: true, description: true, significance: true },
      }),
      this.prisma.galleryItem.findMany({
        where: { templeId: temple.id, isActive: true },
        take: 6,
        orderBy: { displayOrder: "asc" },
        include: { media: { select: { url: true } } },
      }),
    ]);

    const aboutData = {
      temple: {
        id: temple.id,
        name: temple.name,
        description: temple.description,
        establishedYear: temple.establishedYear,
        address: temple.address,
        city: temple.city,
        state: temple.state,
        country: temple.country,
        pincode: temple.pincode,
        latitude: temple.latitude,
        longitude: temple.longitude,
        contactPhone: temple.contactPhone,
        contactEmail: temple.contactEmail,
      },
      info: {
        history: temple.info?.history || null,
        architecture: temple.info?.architecture || null,
        timings: temple.info?.timings || null,
        guidelines: temple.info?.guidelines || null,
        about: temple.info?.about || null,
      },
      deities,
      gallery: gallery.map((g) => ({
        id: g.id,
        title: g.title,
        imageUrl: g.media?.url || null,
      })),
    };

    await this.setCached(cacheKey, aboutData, 120);
    return ApiResponseDto.success(aboutData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // 3. DARSHAN PAGE AGGREGATION
  // ==========================================
  async getDarshanPage(
    templeId?: string,
    targetDate?: string,
  ): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);
    const dateStr = targetDate || TimezoneUtil.formatDateForDb(new Date());
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();

    const cacheKey = `page:darshan:${temple.id}:${dateStr}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const [schedules, slots, aartis] = await Promise.all([
      this.prisma.darshanSchedule.findMany({
        where: {
          templeId: temple.id,
          isActive: true,
          OR: [
            { dayOfWeek: null, specificDate: null },
            { dayOfWeek },
            { specificDate: { gte: startOfDay, lte: endOfDay } },
          ],
        },
        orderBy: { startTime: "asc" },
      }),
      this.prisma.darshanSlot.findMany({
        where: {
          schedule: { templeId: temple.id },
          date: { gte: startOfDay, lte: endOfDay },
          status: "ACTIVE",
        },
        orderBy: { startTime: "asc" },
        include: { schedule: { select: { name: true, isSpecial: true } } },
      }),
      this.prisma.aartiSchedule.findMany({
        where: { templeId: temple.id, status: "ACTIVE" },
        orderBy: { displayOrder: "asc" },
      }),
    ]);

    const darshanData = {
      temple: { id: temple.id, name: temple.name },
      selectedDate: dateStr,
      guidelines: temple.info?.guidelines || null,
      dressCode: temple.info?.about || null,
      schedules: schedules.map((s) => ({
        id: s.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        maxCapacity: s.maxCapacity,
        isSpecial: s.isSpecial,
      })),
      slots: slots.map((sl) => ({
        id: sl.id,
        scheduleName: sl.schedule.name,
        isSpecial: sl.schedule.isSpecial,
        startTime: sl.startTime,
        endTime: sl.endTime,
        capacity: sl.capacity,
        bookedCount: sl.bookedCount,
        available: Math.max(0, sl.capacity - sl.bookedCount),
        isAvailable: sl.capacity > sl.bookedCount,
      })),
      todayAarti: aartis.map((a) => ({
        id: a.id,
        name: a.name,
        startTime: a.startTime,
        endTime: a.endTime,
        description: a.description,
      })),
    };

    await this.setCached(cacheKey, darshanData, 15);
    return ApiResponseDto.success(darshanData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // 4. PUJA PAGE AGGREGATION
  // ==========================================
  async getPujaPage(
    templeId?: string,
    deityId?: string,
    targetDate?: string,
  ): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);
    const dateStr = targetDate || TimezoneUtil.formatDateForDb(new Date());

    const cacheKey = `page:puja:${temple.id}:${deityId || "all"}:${dateStr}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const where: any = { templeId: temple.id, isActive: true };
    if (deityId) where.deityId = deityId;

    const [pujas, deities] = await Promise.all([
      this.prisma.puja.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          deity: { select: { id: true, name: true } },
          slots: {
            where: {
              date: { gte: startOfDay, lte: endOfDay },
              status: "ACTIVE",
            },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              capacity: true,
              bookedCount: true,
            },
          },
        },
      }),
      this.prisma.deity.findMany({
        where: { templeId: temple.id, isActive: true },
        select: { id: true, name: true },
        orderBy: { displayOrder: "asc" },
      }),
    ]);

    const pujaData = {
      temple: { id: temple.id, name: temple.name },
      selectedDate: dateStr,
      deities,
      pujas: pujas.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        pricePaise: p.pricePaise,
        durationMinutes: p.durationMinutes,
        deity: p.deity,
        availableSlots: (p.slots || []).map((sl: any) => ({
          id: sl.id,
          startTime: sl.startTime,
          endTime: sl.endTime,
          capacity: sl.capacity,
          bookedCount: sl.bookedCount,
          available: Math.max(0, sl.capacity - sl.bookedCount),
          isAvailable: sl.capacity > sl.bookedCount,
        })),
      })),
    };

    await this.setCached(cacheKey, pujaData, 30);
    return ApiResponseDto.success(pujaData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // 5. SEVA PAGE AGGREGATION
  // ==========================================
  async getSevaPage(
    templeId?: string,
    deityId?: string,
    targetDate?: string,
  ): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);
    const dateStr = targetDate || TimezoneUtil.formatDateForDb(new Date());

    const cacheKey = `page:seva:${temple.id}:${deityId || "all"}:${dateStr}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const where: any = { templeId: temple.id, isActive: true };
    if (deityId) where.deityId = deityId;

    const [sevas, deities] = await Promise.all([
      this.prisma.seva.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          deity: { select: { id: true, name: true } },
          slots: {
            where: {
              date: { gte: startOfDay, lte: endOfDay },
              status: "ACTIVE",
            },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              capacity: true,
              bookedCount: true,
            },
          },
        },
      }),
      this.prisma.deity.findMany({
        where: { templeId: temple.id, isActive: true },
        select: { id: true, name: true },
        orderBy: { displayOrder: "asc" },
      }),
    ]);

    const sevaData = {
      temple: { id: temple.id, name: temple.name },
      selectedDate: dateStr,
      deities,
      sevas: sevas.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        pricePaise: s.pricePaise,
        durationMinutes: s.durationMinutes,
        deity: s.deity,
        availableSlots: (s.slots || []).map((sl: any) => ({
          id: sl.id,
          startTime: sl.startTime,
          endTime: sl.endTime,
          capacity: sl.capacity,
          bookedCount: sl.bookedCount,
          available: Math.max(0, sl.capacity - sl.bookedCount),
          isAvailable: sl.capacity > sl.bookedCount,
        })),
      })),
    };

    await this.setCached(cacheKey, sevaData, 30);
    return ApiResponseDto.success(sevaData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // 6. EVENTS PAGE AGGREGATION
  // ==========================================
  async getEventsPage(
    templeId?: string,
    page: number = 1,
    limit: number = 10,
    upcoming: boolean = true,
  ): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);
    const skip = (page - 1) * limit;

    const cacheKey = `page:events:${temple.id}:${page}:${limit}:${upcoming}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    const where: any = { templeId: temple.id, status: "PUBLISHED" };
    if (upcoming) {
      where.startDate = { gte: TimezoneUtil.startOfDay() };
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: "asc" },
        include: {
          _count: { select: { registrations: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const eventsData = {
      temple: { id: temple.id, name: temple.name },
      events: events.map((e) => {
        const regCount = e._count?.registrations ?? e.bookedCount ?? 0;
        return {
          id: e.id,
          title: e.title,
          description: e.description,
          imageUrl: e.imageUrl,
          location: e.location,
          startDate: e.startDate,
          endDate: e.endDate,
          capacity: e.capacity,
          registeredCount: regCount,
          availableSpots: e.capacity
            ? Math.max(0, e.capacity - regCount)
            : null,
          isFull: e.capacity ? regCount >= e.capacity : false,
          registrationRequired: e.registrationRequired,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.setCached(cacheKey, eventsData, 60);
    return ApiResponseDto.success(eventsData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // 7. PRASAD PAGE AGGREGATION
  // ==========================================
  async getPrasadPage(
    templeId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);
    const skip = (page - 1) * limit;

    const cacheKey = `page:prasad:${temple.id}:${page}:${limit}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    const where = { templeId: temple.id, isActive: true };

    const [products, total] = await Promise.all([
      this.prisma.prasadProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { displayOrder: "asc" },
      }),
      this.prisma.prasadProduct.count({ where }),
    ]);

    const prasadData = {
      temple: { id: temple.id, name: temple.name },
      products: products.map((p) => {
        const availableStock = Math.max(0, p.stock - p.reservedStock);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          pricePaise: p.pricePaise,
          imageUrl: p.imageUrl,
          inStock: availableStock > 0,
          availableStock,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.setCached(cacheKey, prasadData, 60);
    return ApiResponseDto.success(prasadData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // 8. ACCOMMODATION PAGE AGGREGATION
  // ==========================================
  async getAccommodationPage(
    templeId?: string,
    checkIn?: string,
    checkOut?: string,
    capacity?: number,
  ): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);

    const cacheKey = `page:accommodation:${temple.id}:${checkIn || "none"}:${checkOut || "none"}:${capacity || "all"}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    // Get all active rooms
    const where: any = { templeId: temple.id, status: "AVAILABLE" };
    if (capacity) where.capacity = { gte: Number(capacity) };

    const rooms = await this.prisma.room.findMany({
      where,
      orderBy: [{ type: "asc" }, { pricePaise: "asc" }],
    });

    let availableRooms = rooms;

    // If check-in and check-out provided, compute overlap
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      const bookedRooms = await this.prisma.accommodationBooking.findMany({
        where: {
          templeId: temple.id,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          OR: [
            {
              checkIn: { lte: checkInDate },
              checkOut: { gt: checkInDate },
            },
            {
              checkIn: { lt: checkOutDate },
              checkOut: { gte: checkOutDate },
            },
            {
              checkIn: { gte: checkInDate },
              checkOut: { lte: checkOutDate },
            },
          ],
        },
        select: { roomId: true },
      });

      const bookedRoomIds = new Set(bookedRooms.map((b) => b.roomId));
      availableRooms = rooms.filter((r) => !bookedRoomIds.has(r.id));
    }

    // Group by room type for frontend cards
    const roomTypesMap = new Map<string, any>();
    rooms.forEach((r) => {
      if (!roomTypesMap.has(r.type)) {
        roomTypesMap.set(r.type, {
          type: r.type,
          capacity: r.capacity,
          pricePaise: r.pricePaise,
          amenities: r.amenities,
          description: r.description,
          totalRooms: 0,
          availableCount: 0,
        });
      }
      const entry = roomTypesMap.get(r.type);
      entry.totalRooms++;
    });

    availableRooms.forEach((r) => {
      if (roomTypesMap.has(r.type)) {
        roomTypesMap.get(r.type).availableCount++;
      }
    });

    const accommodationData = {
      temple: { id: temple.id, name: temple.name },
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      roomTypes: Array.from(roomTypesMap.values()),
      availableRooms: availableRooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        type: r.type,
        capacity: r.capacity,
        pricePaise: r.pricePaise,
        amenities: r.amenities,
        floor: r.floor,
        description: r.description,
      })),
      rules: {
        checkInTime: "12:00 PM",
        checkOutTime: "11:00 AM",
        cancellationPolicy: "Full refund 24 hours prior to check-in.",
      },
    };

    await this.setCached(cacheKey, accommodationData, 30);
    return ApiResponseDto.success(accommodationData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // 9. DONATIONS PAGE AGGREGATION
  // ==========================================
  async getDonationsPage(templeId?: string): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);

    const cacheKey = `page:donations:${temple.id}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    const causes = await this.prisma.donationCause.findMany({
      where: { templeId: temple.id, isActive: true },
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isDefault: true,
      },
    });

    const donationsData = {
      temple: { id: temple.id, name: temple.name },
      causes,
      taxExemption: {
        section: "80G",
        description:
          "All donations are 50% exempt from income tax under section 80G of IT Act.",
        panRequired: true,
      },
      suggestedAmountsPaise: [50100, 110000, 210000, 510000, 1100000],
    };

    await this.setCached(cacheKey, donationsData, 120);
    return ApiResponseDto.success(donationsData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // 10. TEMPLE OVERVIEW AGGREGATION
  // ==========================================
  async getTempleOverview(templeId?: string): Promise<ApiResponseDto<any>> {
    const temple = await this.resolveTemple(templeId);

    const cacheKey = `page:overview:${temple.id}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return ApiResponseDto.success(cached, {
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    const [deities, aartis, gallery] = await Promise.all([
      this.prisma.deity.findMany({
        where: { templeId: temple.id, isActive: true },
        select: { id: true, name: true, description: true },
        orderBy: { displayOrder: "asc" },
      }),
      this.prisma.aartiSchedule.findMany({
        where: { templeId: temple.id, status: "ACTIVE" },
        select: { id: true, name: true, startTime: true, endTime: true },
        orderBy: { displayOrder: "asc" },
      }),
      this.prisma.galleryItem.findMany({
        where: { templeId: temple.id, isActive: true },
        take: 8,
        orderBy: { displayOrder: "asc" },
        include: { media: { select: { url: true } } },
      }),
    ]);

    const overviewData = {
      temple: {
        id: temple.id,
        name: temple.name,
        description: temple.description,
        establishedYear: temple.establishedYear,
      },
      deities,
      timings: {
        general: temple.info?.timings || "Open Daily: 06:00 AM - 09:00 PM",
        aarti: aartis,
      },
      contact: {
        phone: temple.contactPhone,
        email: temple.contactEmail,
      },
      location: {
        address: temple.address,
        city: temple.city,
        state: temple.state,
        country: temple.country,
        pincode: temple.pincode,
        latitude: temple.latitude,
        longitude: temple.longitude,
      },
      gallery: gallery.map((g) => ({
        id: g.id,
        title: g.title,
        imageUrl: g.media?.url || null,
      })),
    };

    await this.setCached(cacheKey, overviewData, 120);
    return ApiResponseDto.success(overviewData, {
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  }
}
