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

import { TempleInfoService } from "./temple-info.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

@ApiTags("Temple Info")
@Controller("temples/:templeId/info")
export class TempleInfoController {
  constructor(private templeInfoService: TempleInfoService) {}

  @Get()
  @ApiOperation({ summary: "Get temple information (public)" })
  async findByTemple(@Param("templeId") templeId: string) {
    return this.templeInfoService.findByTemple(templeId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get temple info by ID (public)" })
  async findById(@Param("id") id: string) {
    return this.templeInfoService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create temple info (staff+)" })
  async create(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.templeInfoService.create(templeId, data);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update temple info (staff+)" })
  async update(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.templeInfoService.update(id, data, user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete temple info (admin only)" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.templeInfoService.delete(id, user.role);
  }
}
