import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";

import { QrService } from "./qr.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("QR Verification")
@Controller("qr")
export class QrController {
  constructor(private qrService: QrService) {}

  @Get("verify/:qrToken")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify QR token (staff+)" })
  async verifyQr(@Param("qrToken") qrToken: string) {
    return this.qrService.verifyQrToken(qrToken);
  }

  @Post("check-in/booking")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check in booking via QR (staff+)" })
  async checkInBooking(
    @Body() data: { qrToken: string; templeId: string },
    @CurrentUser() user: any,
  ) {
    return this.qrService.checkInBooking(data.qrToken, user.id, data.templeId);
  }

  @Post("check-in/event")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check in event registration via QR (staff+)" })
  async checkInEvent(
    @Body() data: { qrToken: string },
    @CurrentUser() user: any,
  ) {
    return this.qrService.checkInEvent(data.qrToken, user.id);
  }

  @Post("check-in/accommodation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check in accommodation via QR (staff+)" })
  async checkInAccommodation(
    @Body() data: { qrToken: string; templeId: string },
    @CurrentUser() user: any,
  ) {
    return this.qrService.checkInAccommodation(
      data.qrToken,
      user.id,
      data.templeId,
    );
  }

  @Post("check-out/accommodation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check out accommodation via QR (staff+)" })
  async checkOutAccommodation(
    @Body() data: { qrToken: string; templeId: string },
  ) {
    return this.qrService.checkOutAccommodation(data.qrToken, data.templeId);
  }

  @Post("temples/:templeId/regenerate/booking-qrs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Regenerate missing booking QR codes (manager+)" })
  async regenerateBookingQrs(@Param("templeId") templeId: string) {
    return this.qrService.regenerateMissingBookingQrs(templeId);
  }

  @Post("temples/:templeId/regenerate/accommodation-qrs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Regenerate missing accommodation QR codes (manager+)",
  })
  async regenerateAccommodationQrs(@Param("templeId") templeId: string) {
    return this.qrService.regenerateMissingAccommodationQrs(templeId);
  }
}
