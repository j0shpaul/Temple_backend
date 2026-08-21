import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { PagesService } from "./pages.service";

@ApiTags("Pages")
@Controller()
export class PagesController {
  constructor(private pagesService: PagesService) {}

  @Get("home")
  @ApiOperation({
    summary: "Home Page Aggregation",
    description: "Aggregates hero banner, today's darshan & aarti, featured pujas/sevas, upcoming events, announcements, and featured prasad in a single request.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID (defaults to primary temple)" })
  @ApiResponse({ status: 200, description: "Home page aggregated dataset" })
  async getHomePage(@Query("templeId") templeId?: string) {
    return this.pagesService.getHomePage(templeId);
  }

  @Get("about")
  @ApiOperation({
    summary: "About Page Aggregation",
    description: "Aggregates temple identity, history, architecture, timings, guidelines, enshrined deities, and gallery preview.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID" })
  @ApiResponse({ status: 200, description: "About page aggregated dataset" })
  async getAboutPage(@Query("templeId") templeId?: string) {
    return this.pagesService.getAboutPage(templeId);
  }

  @Get("darshan")
  @ApiOperation({
    summary: "Darshan Page Aggregation",
    description: "Aggregates darshan schedules, real-time slot availability for selected date, today's aarti timings, and darshan rules.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID" })
  @ApiQuery({ name: "date", required: false, type: String, description: "Date in YYYY-MM-DD format (defaults to today)" })
  @ApiResponse({ status: 200, description: "Darshan page aggregated dataset" })
  async getDarshanPage(
    @Query("templeId") templeId?: string,
    @Query("date") date?: string,
  ) {
    return this.pagesService.getDarshanPage(templeId, date);
  }

  @Get("puja")
  @ApiOperation({
    summary: "Puja Ceremonies Page Aggregation",
    description: "Aggregates active puja ceremonies, deity filter list, descriptions, pricing, duration, and available slots.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID" })
  @ApiQuery({ name: "deityId", required: false, type: String, description: "Filter by deity ID" })
  @ApiQuery({ name: "date", required: false, type: String, description: "Date in YYYY-MM-DD format" })
  @ApiResponse({ status: 200, description: "Puja page aggregated dataset" })
  async getPujaPage(
    @Query("templeId") templeId?: string,
    @Query("deityId") deityId?: string,
    @Query("date") date?: string,
  ) {
    return this.pagesService.getPujaPage(templeId, deityId, date);
  }

  @Get("seva")
  @ApiOperation({
    summary: "Seva Offerings Page Aggregation",
    description: "Aggregates active seva offerings, deity filter list, pricing, and available booking slots.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID" })
  @ApiQuery({ name: "deityId", required: false, type: String, description: "Filter by deity ID" })
  @ApiQuery({ name: "date", required: false, type: String, description: "Date in YYYY-MM-DD format" })
  @ApiResponse({ status: 200, description: "Seva page aggregated dataset" })
  async getSevaPage(
    @Query("templeId") templeId?: string,
    @Query("deityId") deityId?: string,
    @Query("date") date?: string,
  ) {
    return this.pagesService.getSevaPage(templeId, deityId, date);
  }

  @Get("events")
  @ApiOperation({
    summary: "Events Page Aggregation",
    description: "Aggregates paginated upcoming and active festivals, registration availability, and event spots.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default 1)" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Page limit (default 10)" })
  @ApiQuery({ name: "upcoming", required: false, type: Boolean, description: "Filter upcoming only (default true)" })
  @ApiResponse({ status: 200, description: "Events page aggregated dataset" })
  async getEventsPage(
    @Query("templeId") templeId?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("upcoming") upcoming?: boolean,
  ) {
    return this.pagesService.getEventsPage(
      templeId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      upcoming !== undefined ? String(upcoming) === "true" : true,
    );
  }

  @Get("prasad")
  @ApiOperation({
    summary: "Prasad Catalog Page Aggregation",
    description: "Aggregates available prasad products with public stock indicator, prices, images, and pagination.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default 1)" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Page limit (default 20)" })
  @ApiResponse({ status: 200, description: "Prasad catalog aggregated dataset" })
  async getPrasadPage(
    @Query("templeId") templeId?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.pagesService.getPrasadPage(
      templeId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get("accommodation")
  @ApiOperation({
    summary: "Accommodation Page Aggregation",
    description: "Aggregates room types, pricing, amenities, house rules, and real-time room availability for check-in/out range.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID" })
  @ApiQuery({ name: "checkIn", required: false, type: String, description: "Check-in date (YYYY-MM-DD)" })
  @ApiQuery({ name: "checkOut", required: false, type: String, description: "Check-out date (YYYY-MM-DD)" })
  @ApiQuery({ name: "capacity", required: false, type: Number, description: "Minimum room capacity" })
  @ApiResponse({ status: 200, description: "Accommodation page aggregated dataset" })
  async getAccommodationPage(
    @Query("templeId") templeId?: string,
    @Query("checkIn") checkIn?: string,
    @Query("checkOut") checkOut?: string,
    @Query("capacity") capacity?: number,
  ) {
    return this.pagesService.getAccommodationPage(
      templeId,
      checkIn,
      checkOut,
      capacity ? Number(capacity) : undefined,
    );
  }

  @Get("donations")
  @ApiOperation({
    summary: "Donations Page Aggregation",
    description: "Aggregates active donation causes, 80G tax exemption guidelines, and suggested donation amounts.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID" })
  @ApiResponse({ status: 200, description: "Donations page aggregated dataset" })
  async getDonationsPage(@Query("templeId") templeId?: string) {
    return this.pagesService.getDonationsPage(templeId);
  }

  @Get("temple-overview")
  @ApiOperation({
    summary: "Temple Overview Aggregation",
    description: "Comprehensive temple identity snapshot with timings, contact, location coordinates, deities, and photo gallery.",
  })
  @ApiQuery({ name: "templeId", required: false, type: String, description: "Temple ID" })
  @ApiResponse({ status: 200, description: "Temple overview aggregated dataset" })
  async getTempleOverview(@Query("templeId") templeId?: string) {
    return this.pagesService.getTempleOverview(templeId);
  }
}
