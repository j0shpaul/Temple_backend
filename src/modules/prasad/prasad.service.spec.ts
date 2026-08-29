import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { PrasadService } from "./prasad.service";
import { PaymentService } from "../payments/payment.service";
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
  let paymentService: PaymentService;

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

  const mockPaymentService = {
    createPaymentForPrasadOrder: jest.fn().mockResolvedValue({
      data: {
        paymentId: "payment-1",
        cfOrderId: "PR_123",
        paymentSessionId: "session_123",
      },
    }),
    reconcilePayment: jest.fn().mockResolvedValue({
      data: { status: "SUCCESS" },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrasadService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get<PrasadService>(PrasadService);
    prisma = module.get<PrismaService>(PrismaService);
    paymentService = module.get<PaymentService>(PaymentService);
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

      expect(result.data).toEqual(
        expect.objectContaining({
          id: "product-1",
          availableStock: 90,
          isOutOfStock: false,
        }),
      );
    });

    it("should throw if product not found", async () => {
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(null);

      await expect(service.getProduct("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createProduct", () => {
    it("should create product when called by staff/admin", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue({ id: "temple-1" });
      mockPrisma.prasadProduct.create.mockResolvedValue(mockProduct);

      const result = await service.createProduct(
        "temple-1",
        {
          name: "Laddu",
          pricePaise: 10000,
          stock: 100,
        },
        "ADMIN",
      );

      expect(result.data).toEqual(mockProduct);
    });

    it("should throw ForbiddenException if devotee calls createProduct", async () => {
      await expect(
        service.createProduct(
          "temple-1",
          { name: "Laddu", pricePaise: 10000, stock: 100 },
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("adjustStock", () => {
    it("should update stock with delta", async () => {
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.prasadProduct.update.mockResolvedValue({
        ...mockProduct,
        stock: 120,
      });

      const result = await service.adjustStock("product-1", 20, "ADMIN");

      expect(result.data.stock).toBe(120);
    });

    it("should throw ConflictException if stock falls below reserved", async () => {
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(mockProduct); // stock: 100, reserved: 10

      await expect(
        service.adjustStock("product-1", -95, "ADMIN"), // newStock = 5 < 10
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("createAddress", () => {
    it("should create delivery address for user", async () => {
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
    it("should list addresses for user", async () => {
      mockPrisma.address.findMany.mockResolvedValue([mockAddress]);

      const result = await service.listAddresses("user-1");

      expect(result.data).toEqual([mockAddress]);
    });
  });

  describe("createOrder", () => {
    it("should create order with atomic stock reservation and delegate payment", async () => {
      mockPrisma.address.findFirst.mockResolvedValue(mockAddress);
      mockPrisma.prasadProduct.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.prasadOrder.create.mockResolvedValue(mockOrder);

      const result = await service.createOrder("user-1", {
        templeId: "temple-1",
        addressId: "addr-1",
        items: [{ productId: "product-1", quantity: 2 }],
      });

      expect(result.data.order).toEqual(mockOrder);
      expect(result.data.gateway).toBe("CASHFREE");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.prasadProduct.update).toHaveBeenCalledWith({
        where: { id: "product-1" },
        data: { reservedStock: { increment: 2 } },
      });
      expect(
        mockPaymentService.createPaymentForPrasadOrder,
      ).toHaveBeenCalledWith("order-1", "user-1");
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
    it("should reconcile payment via PaymentService", async () => {
      const pendingOrder = { ...mockOrder, status: "PLACED" };
      mockPrisma.prasadOrder.findUnique.mockResolvedValue(pendingOrder);
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        prasadOrderId: "order-1",
        status: PaymentStatus.PENDING,
      });

      const result = await service.verifyOrderPayment({
        orderId: "order-1",
      });

      expect(result.data.status).toBe("SUCCESS");
      expect(mockPaymentService.reconcilePayment).toHaveBeenCalledWith(
        "payment-1",
      );
    });

    it("should throw if order not found", async () => {
      mockPrisma.prasadOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyOrderPayment({ orderId: "invalid" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("expirePendingOrders", () => {
    it("should expire abandoned prasad orders and restore reserved stock", async () => {
      const expired = [
        {
          id: "order-exp-1",
          status: "PLACED",
          items: [{ productId: "product-1", quantity: 2 }],
          payment: { id: "pay-1", status: "PENDING" },
        },
      ];

      mockPrisma.prasadOrder.findMany.mockResolvedValue(expired);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          prasadOrder: {
            findUnique: jest.fn().mockResolvedValue(expired[0]),
            update: jest.fn().mockResolvedValue({ id: "order-exp-1", status: "CANCELLED" }),
          },
          prasadProduct: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          payment: {
            update: jest.fn().mockResolvedValue({ id: "pay-1", status: "CANCELLED" }),
          },
        });
      });

      const count = await service.expirePendingOrders(30);
      expect(count).toBe(1);
    });
  });
});
