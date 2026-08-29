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

import { PrasadService } from "./prasad.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Prasad")
@Controller("temples/:templeId/prasad")
export class PrasadController {
  constructor(private prasadService: PrasadService) {}

  // Products
  @Get("products")
  @ApiOperation({ summary: "List prasad products for a temple" })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  async listProducts(
    @Param("templeId") templeId: string,
    @Query("isActive") isActive?: boolean,
  ) {
    return this.prasadService.listProducts(templeId, isActive);
  }

  @Post("products")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create prasad product (staff+)" })
  async createProduct(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.prasadService.createProduct(templeId, data, user.role);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "Get prasad product by ID" })
  async getProduct(@Param("id") id: string) {
    return this.prasadService.getProduct(id);
  }

  @Put("products/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update prasad product (staff+)" })
  async updateProduct(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.prasadService.updateProduct(id, data, user.role);
  }

  @Put("products/:id/stock")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update prasad product stock (manager+)" })
  async updateStock(
    @Param("id") id: string,
    @Body() data: { quantity: number; mode: "SET" | "INCREMENT" | "DECREMENT" },
    @CurrentUser() user: any,
  ) {
    return this.prasadService.updateStock(id, data.quantity, data.mode, user.role);
  }

  @Delete("products/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete prasad product (admin only)" })
  async deleteProduct(@Param("id") id: string, @CurrentUser() user: any) {
    return this.prasadService.deleteProduct(id, user.role);
  }

  // Addresses
  @Post("addresses")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create address" })
  async createAddress(@CurrentUser() user: any, @Body() data: any) {
    return this.prasadService.createAddress(user.id, data);
  }

  @Get("addresses")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List user addresses" })
  async listAddresses(@CurrentUser() user: any) {
    return this.prasadService.listAddresses(user.id);
  }

  // Orders
  @Post("orders")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create prasad order (checkout hold)" })
  async createOrder(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.prasadService.createOrder(user.id, {
      ...data,
      templeId,
    });
  }

  @Post("orders/verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify order payment" })
  async verifyPayment(@Body() data: any) {
    return this.prasadService.verifyOrderPayment(data);
  }

  @Get("orders/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user prasad orders" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMyOrders(
    @CurrentUser() user: any,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.prasadService.getUserOrders(user.id, {
      status,
      page,
      limit,
    });
  }

  @Get("orders/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get order by ID" })
  async getOrder(@Param("id") id: string, @CurrentUser() user: any) {
    return this.prasadService.getOrderById(id, user.id, user.role);
  }

  @Get("orders")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get temple orders (staff+)" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getTempleOrders(
    @Param("templeId") templeId: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.prasadService.getTempleOrders(templeId, {
      status,
      page,
      limit,
    });
  }

  @Put("orders/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update order status (staff+)" })
  async updateOrderStatus(
    @Param("id") id: string,
    @Body() data: { status: string },
    @CurrentUser() user: any,
  ) {
    return this.prasadService.updateOrderStatus(id, data.status, user.role);
  }
}
