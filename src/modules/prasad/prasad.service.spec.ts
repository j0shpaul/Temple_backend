import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { PrasadService } from "./prasad.service";
import { RazorpayService } from "../payments/razorpay.service";
import { PrasadOrderStatus, PaymentStatus } from "@prisma/client";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";

describe("PrasadService", () => {
  let service: PrasadService;
  let prisma: PrismaService;
  let razorpay: RazorpayService;

  const mockProduct = {
    id: "product-1",
    templeId: "temple-1",
    name: "Laddu Prasad",
    description: "Sweet laddu",
    pricePaise: 10000,
    stock: 100,
    reservedStock: 10,
    imageUrl: "https://example.com/laddu.jpg",
    displayOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAddress = {
    id: "addr-1",
    userId: "user-1",
    line1: "123 Main St",
    line2: null,
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    phone: "+919876543210",
    country: "India",
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrder = {
    id: "order-1",
    userId: "user-1",
    templeId: "temple-1",
    addressId: "addr-1",
    status: "PLACED",
    subtotalPaise: 20000,
    deliveryPaise: 0,
    totalPaise: 20000,
    reference: "PRD-TMP-123456",
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [{ productId: "product-1", quantity: 2, pricePaise: 10000 }],
  };

  const mockPrisma: any = {
    prasadProduct: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    prasadOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    prasadOrderItem: {
      findMany: jest.fn(),
    },
    address: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    temple: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    paymentEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((fn) => fn(mockPrisma)),
  };

  const mockRazorpayService = {
    createOrder: jest.fn(),
    verifyPayment: jest.fn(),
    refund: jest.fn(),
    getKeyId: jest.fn().mockReturnValue("rzp_test_key"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrasadService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RazorpayService, useValue: mockRazorpayService },
      ],
    }).compile();

    service = module.get<PrasadService>(PrasadService);
    prisma = module.get<PrismaService>(PrismaService);
    razorpay = module.get<RazorpayService>(RazorpayService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("listProducts", () => {
    it("should return active products for temple with availability", async () => {
      mockPrisma.prasadProduct.findMany.mockResolvedValue([mockProduct]);

      const result = await service.listProducts("temple-1");

      expect(result.data).toHaveLength(1);
      expect(result.data![0].availableStock).toBe(90); // 100 - 10
      expect(result.data![0].isOutOfStock).toBe(false);
    });
  });

  describe("getProduct", () => {
    it("should return product by id with availability", async () => {
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProduct("product-1");

      expect(result.data.availableStock).toBe(90);
    });

    it("should throw if not found", async () => {
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(null);

      await expect(service.getProduct("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createProduct", () => {
    it("should create product", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue({ id: "temple-1" });
      mockPrisma.prasadProduct.create.mockResolvedValue(mockProduct);

      const result = await service.createProduct(
        "temple-1",
        {
          name: "Laddu Prasad",
          pricePaise: 10000,
          stock: 100,
        },
        "STAFF",
      );

      expect(result.data).toEqual(mockProduct);
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      await expect(
        service.createProduct(
          "temple-1",
          {
            name: "Laddu Prasad",
            pricePaise: 10000,
            stock: 100,
          },
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateProduct", () => {
    it("should update product", async () => {
      mockPrisma.prasadProduct.update.mockResolvedValue({
        ...mockProduct,
        pricePaise: 15000,
      });

      const result = await service.updateProduct(
        "product-1",
        { pricePaise: 15000 },
        "STAFF",
      );

      expect(result.data.pricePaise).toBe(15000);
    });
  });

  describe("adjustStock", () => {
    it("should adjust stock", async () => {
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.prasadProduct.update.mockResolvedValue({
        ...mockProduct,
        stock: 150,
      });

      const result = await service.adjustStock("product-1", 50, "STAFF");

      expect(result.data.stock).toBe(150);
    });

    it("should throw ConflictException if stock goes below reserved", async () => {
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(mockProduct);

      await expect(
        service.adjustStock("product-1", -95, "STAFF"),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("createAddress", () => {
    it("should create address", async () => {
      mockPrisma.address.create.mockResolvedValue(mockAddress);

      const result = await service.createAddress("user-1", {
        line1: "123 Main St",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        phone: "+919876543210",
      });

      expect(result.data).toEqual(mockAddress);
    });
  });

  describe("listAddresses", () => {
    it("should return user addresses", async () => {
      mockPrisma.address.findMany.mockResolvedValue([mockAddress]);

      const result = await service.listAddresses("user-1");

      expect(result.data).toEqual([mockAddress]);
    });
  });

  describe("createOrder", () => {
    it("should create order with atomic stock reservation", async () => {
      mockPrisma.address.findFirst.mockResolvedValue(mockAddress);
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.prasadOrder.create.mockResolvedValue(mockOrder);
      mockPrisma.payment.create.mockResolvedValue({});
      mockRazorpayService.createOrder.mockResolvedValue({ id: "order_123" });

      const result = await service.createOrder("user-1", {
        templeId: "temple-1",
        addressId: "addr-1",
        items: [{ productId: "product-1", quantity: 2 }],
      });

      expect(result.data.order).toEqual(mockOrder);
      expect(result.data.razorpayOrderId).toBe("order_123");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.prasadProduct.update).toHaveBeenCalledWith({
        where: { id: "product-1" },
        data: { reservedStock: { increment: 2 } },
      });
    });

    it("should throw if insufficient stock", async () => {
      const lowStockProduct = { ...mockProduct, stock: 1, reservedStock: 0 };
      mockPrisma.address.findFirst.mockResolvedValue(mockAddress);
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(lowStockProduct);

      await expect(
        service.createOrder("user-1", {
          templeId: "temple-1",
          addressId: "addr-1",
          items: [{ productId: "product-1", quantity: 2 }],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw if address not found", async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrder("user-1", {
          templeId: "temple-1",
          addressId: "invalid",
          items: [{ productId: "product-1", quantity: 2 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("verifyOrderPayment", () => {
    it("should confirm order and decrement stock", async () => {
      const pendingOrder = { ...mockOrder, status: "PLACED" };
      mockPrisma.prasadOrder.findUnique.mockResolvedValue(pendingOrder);
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        prasadOrderId: "order-1",
        status: PaymentStatus.PENDING,
      });
      mockRazorpayService.verifyPayment.mockResolvedValue(true);
      mockPrisma.payment.update.mockResolvedValue({});
      mockPrisma.prasadOrderItem.findMany.mockResolvedValue([
        { productId: "product-1", quantity: 2 },
      ]);
      mockPrisma.prasadProduct.update.mockResolvedValue({});
      mockPrisma.prasadOrder.update.mockResolvedValue({
        ...pendingOrder,
        status: "CONFIRMED",
      });
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      const result = await service.verifyOrderPayment({
        orderId: "order-1",
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "sig_123",
      });

      expect(result.data.status).toBe("CONFIRMED");
      expect(mockPrisma.prasadProduct.update).toHaveBeenCalledWith({
        where: { id: "product-1" },
        data: {
          stock: { decrement: 2 },
          reservedStock: { decrement: 2 },
        },
      });
    });

    it("should throw if order already paid", async () => {
      const paidOrder = { ...mockOrder, status: "CONFIRMED" };
      mockPrisma.prasadOrder.findUnique.mockResolvedValue(paidOrder);
      mockPrisma.payment.findUnique.mockResolvedValue({
        status: PaymentStatus.SUCCESS,
      });

      await expect(
        service.verifyOrderPayment({
          orderId: "order-1",
          razorpayOrderId: "order_123",
          razorpayPaymentId: "pay_123",
          razorpaySignature: "sig_123",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getOrderById", () => {
    it("should return order by id", async () => {
      mockPrisma.prasadOrder.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrderById("order-1");

      expect(result.data).toEqual(mockOrder);
    });

    it("should throw if not found", async () => {
      mockPrisma.prasadOrder.findUnique.mockResolvedValue(null);

      await expect(service.getOrderById("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getUserOrders", () => {
    it("should return paginated orders for user", async () => {
      mockPrisma.prasadOrder.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.prasadOrder.count.mockResolvedValue(1);

      const result = await service.getUserOrders("user-1", {
        page: 1,
        limit: 20,
      });

      expect(result.data.orders).toEqual([mockOrder]);
      expect(result.data.total).toBe(1);
    });
  });

  describe("getTempleOrders", () => {
    it("should return paginated orders for temple", async () => {
      mockPrisma.prasadOrder.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.prasadOrder.count.mockResolvedValue(1);

      const result = await service.getTempleOrders("temple-1", {
        page: 1,
        limit: 50,
      });

      expect(result.data.orders).toEqual([mockOrder]);
      expect(result.data.total).toBe(1);
    });
  });

  describe("updateOrderStatus", () => {
    it("should update order status", async () => {
      mockPrisma.prasadOrder.update.mockResolvedValue({
        ...mockOrder,
        status: "CONFIRMED",
      });

      const result = await service.updateOrderStatus(
        "order-1",
        "CONFIRMED",
        "STAFF",
      );

      expect(result.data.status).toBe("CONFIRMED");
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      await expect(
        service.updateOrderStatus("order-1", "CONFIRMED", "DEVOTEE"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for invalid status", async () => {
      await expect(
        service.updateOrderStatus("order-1", "INVALID", "STAFF"),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
