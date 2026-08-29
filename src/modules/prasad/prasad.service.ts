import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { PaymentService } from "../payments/payment.service";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class PrasadService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  // ============== PRODUCT MANAGEMENT ==============

  async createProduct(
    templeId: string,
    data: {
      name: string;
      description?: string;
      pricePaise: number;
      stock: number;
      imageUrl?: string;
      displayOrder?: number;
      isActive?: boolean;
    },
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const temple = await this.prisma.temple.findUnique({
      where: { id: templeId },
    });
    if (!temple) throw new NotFoundException("Temple not found");

    const product = await this.prisma.prasadProduct.create({
      data: {
        templeId,
        name: data.name,
        description: data.description,
        pricePaise: data.pricePaise,
        stock: data.stock,
        imageUrl: data.imageUrl,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    return ApiResponseDto.success(product);
  }

  async listProducts(
    templeId: string,
    isActive?: boolean,
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (isActive !== undefined) where.isActive = isActive;

    const products = await this.prisma.prasadProduct.findMany({
      where,
      orderBy: { displayOrder: "asc" },
    });

    const withAvailability = products.map((p) => ({
      ...p,
      availableStock: p.stock - p.reservedStock,
      isOutOfStock: p.stock - p.reservedStock <= 0,
    }));

    return ApiResponseDto.success(withAvailability);
  }

  async getProduct(id: string): Promise<ApiResponseDto<any>> {
    const product = await this.prisma.prasadProduct.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException("Product not found");

    return ApiResponseDto.success({
      ...product,
      availableStock: product.stock - product.reservedStock,
      isOutOfStock: product.stock - product.reservedStock <= 0,
    });
  }

  async updateProduct(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      pricePaise: number;
      stock: number;
      imageUrl: string;
      displayOrder: number;
      isActive: boolean;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const product = await this.prisma.prasadProduct.update({
      where: { id },
      data,
    });
    return ApiResponseDto.success(product);
  }

  async adjustStock(
    id: string,
    delta: number,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const product = await this.prisma.prasadProduct.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException("Product not found");

    const newStock = product.stock + delta;
    if (newStock < product.reservedStock) {
      throw new ConflictException("Cannot reduce stock below reserved amount");
    }

    const updated = await this.prisma.prasadProduct.update({
      where: { id },
      data: { stock: newStock },
    });

    return ApiResponseDto.success(updated);
  }

  async updateStock(
    id: string,
    quantity: number,
    mode: "SET" | "INCREMENT" | "DECREMENT",
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const product = await this.prisma.prasadProduct.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException("Product not found");

    let newStock = product.stock;
    if (mode === "SET") {
      newStock = quantity;
    } else if (mode === "INCREMENT") {
      newStock = product.stock + quantity;
    } else if (mode === "DECREMENT") {
      newStock = product.stock - quantity;
    } else {
      throw new BadRequestException("Invalid stock update mode");
    }

    if (newStock < product.reservedStock) {
      throw new ConflictException("Cannot reduce stock below reserved amount");
    }

    const updated = await this.prisma.prasadProduct.update({
      where: { id },
      data: { stock: newStock },
    });

    return ApiResponseDto.success(updated);
  }

  async deleteProduct(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    await this.prisma.prasadProduct.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Product deleted" });
  }

  // ============== ADDRESS MANAGEMENT ==============

  async createAddress(
    userId: string,
    data: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
      phone: string;
      country?: string;
      isDefault?: boolean;
    },
  ): Promise<ApiResponseDto<any>> {
    const address = await this.prisma.address.create({
      data: {
        userId,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone,
        country: data.country ?? "India",
        isDefault: data.isDefault ?? false,
      },
    });

    return ApiResponseDto.success(address);
  }

  async listAddresses(userId: string): Promise<ApiResponseDto<any[]>> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return ApiResponseDto.success(addresses);
  }

  // ============== ORDER MANAGEMENT ==============

  async createOrder(
    userId: string,
    data: {
      templeId: string;
      addressId: string;
      items: { productId: string; quantity: number }[];
      deliveryPaise?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    if (!data.items?.length)
      throw new BadRequestException("Order must have at least one item");

    const order = await this.prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({
        where: { id: data.addressId, userId },
      });
      if (!address) throw new NotFoundException("Address not found");

      let subtotalPaise = 0;
      const orderItems: any[] = [];

      for (const item of data.items) {
        if (item.quantity <= 0)
          throw new BadRequestException("Quantity must be positive");

        const product = await tx.prasadProduct.findUnique({
          where: { id: item.productId },
        });
        if (!product || product.templeId !== data.templeId) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }
        if (product.stock - product.reservedStock < item.quantity) {
          throw new ConflictException(`Insufficient stock for ${product.name}`);
        }

        // Atomically reserve stock with row-level conditional locking
        if (typeof (tx as any).$executeRaw === "function") {
          const result = await tx.$executeRaw`
            UPDATE "PrasadProduct"
            SET "reservedStock" = "reservedStock" + ${item.quantity}
            WHERE "id" = ${product.id}
              AND "isActive" = true
              AND ("stock" - "reservedStock") >= ${item.quantity}
          `;
          if (result === 0) {
            throw new ConflictException(`Insufficient stock for ${product.name}`);
          }
        } else {
          await tx.prasadProduct.update({
            where: { id: product.id },
            data: { reservedStock: { increment: item.quantity } },
          });
        }

        const lineTotal = product.pricePaise * item.quantity;
        subtotalPaise += lineTotal;

        orderItems.push({
          productId: product.id,
          productName: product.name,
          unitPricePaise: product.pricePaise,
          quantity: item.quantity,
          lineTotalPaise: lineTotal,
        });
      }

      const deliveryPaise = data.deliveryPaise ?? 0;
      const totalPaise = subtotalPaise + deliveryPaise;
      const reference = IdUtil.generateOrderReference();

      return tx.prasadOrder.create({
        data: {
          userId,
          templeId: data.templeId,
          addressId: data.addressId,
          status: "PLACED",
          subtotalPaise,
          deliveryPaise,
          totalPaise,
          reference,
          items: { create: orderItems },
        },
        include: { items: true, address: true },
      });
    });

    // Create payment via central PaymentService if there's an amount
    if (order.totalPaise > 0) {
      const paymentResult =
        await this.paymentService.createPaymentForPrasadOrder(order.id, userId);

      return ApiResponseDto.success({
        order,
        orderId: order.id,
        paymentId: paymentResult.data?.paymentId,
        cfOrderId: paymentResult.data?.cfOrderId,
        paymentSessionId: paymentResult.data?.paymentSessionId,
        amountPaise: order.totalPaise,
        gateway: "CASHFREE",
      });
    }

    return ApiResponseDto.success({ order });
  }

  async verifyOrderPayment(data: {
    orderId: string;
  }): Promise<ApiResponseDto<any>> {
    const order = await this.prisma.prasadOrder.findUnique({
      where: { id: data.orderId },
    });
    if (!order) throw new NotFoundException("Order not found");

    const payment = await this.prisma.payment.findUnique({
      where: { prasadOrderId: data.orderId },
    });
    if (!payment) throw new NotFoundException("Payment not found");

    return this.paymentService.reconcilePayment(payment.id);
  }

  async getOrderById(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<ApiResponseDto<any>> {
    const order = await this.prisma.prasadOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        address: true,
        temple: { select: { id: true, name: true } },
        payment: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found");

    if (
      userId &&
      userRole &&
      order.userId !== userId &&
      !["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(userRole)
    ) {
      throw new ForbiddenException("Cannot access another user's order");
    }

    return ApiResponseDto.success(order);
  }

  async getUserOrders(
    userId: string,
    params: { status?: string; page?: number; limit?: number },
  ): Promise<ApiResponseDto<any>> {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status as any;

    const [orders, total] = await Promise.all([
      this.prisma.prasadOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { items: true, temple: { select: { id: true, name: true } } },
      }),
      this.prisma.prasadOrder.count({ where }),
    ]);

    return ApiResponseDto.success(
      { orders, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async getTempleOrders(
    templeId: string,
    params: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { status, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = { templeId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.prasadOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          user: { select: { id: true, name: true, phone: true } },
          address: true,
        },
      }),
      this.prisma.prasadOrder.count({ where }),
    ]);

    return ApiResponseDto.success(
      { orders, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async updateOrderStatus(
    id: string,
    status: string,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const validStatuses = [
      "PLACED",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException("Invalid order status");
    }

    const order = await this.prisma.prasadOrder.update({
      where: { id },
      data: { status: status as any },
    });
    return ApiResponseDto.success(order);
  }

  // ============== ABANDONED ORDER EXPIRATION ==============

  async expirePendingOrders(olderThanMinutes = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const expired = await this.prisma.prasadOrder.findMany({
      where: {
        status: "PLACED",
        createdAt: { lt: cutoff },
      },
      include: { items: true, payment: true },
    });

    let count = 0;
    for (const rawOrder of expired) {
      const order = rawOrder as any;
      if (order.payment?.status === "SUCCESS") continue;

      await this.prisma.$transaction(async (tx) => {
        const current = await tx.prasadOrder.findUnique({
          where: { id: order.id },
          include: { payment: true },
        });
        if (!current || current.status !== "PLACED" || (current as any).payment?.status === "SUCCESS") {
          return;
        }

        await tx.prasadOrder.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });

        // Release reserved inventory
        for (const item of order.items) {
          await tx.prasadProduct.updateMany({
            where: { id: item.productId, reservedStock: { gte: item.quantity } },
            data: { reservedStock: { decrement: item.quantity } },
          });
        }

        if (order.payment?.id && order.payment.status === "PENDING") {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: "CANCELLED" },
          });
        }

        count++;
      });
    }
    return count;
  }
}
