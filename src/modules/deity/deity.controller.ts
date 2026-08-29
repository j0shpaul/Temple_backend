import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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

import { DeityService } from "./deity.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Deity")
@Controller("temples/:templeId/deities")
export class DeityController {
  constructor(private deityService: DeityService) {}

  @Get()
  @ApiOperation({ summary: "List deities for a temple (public)" })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  async findByTemple(
    @Param("templeId") templeId: string,
    @Query("isActive") isActive?: boolean,
  ) {
    return this.deityService.findByTemple(templeId, isActive);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get deity by ID (public)" })
  async findById(@Param("id") id: string) {
    return this.deityService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create deity (staff+)" })
  async create(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.deityService.create(templeId, data);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update deity (staff+)" })
  async update(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.deityService.update(id, data, user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete deity (admin only)" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.deityService.delete(id, user.role);
  }
}
