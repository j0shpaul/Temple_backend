import {
  seedProductionMasterData,
  resetAndSeedDevelopmentData,
} from "../../../prisma/seed";

describe("Seed Safety Verification", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("should fail-safe and abort destructive reset when NODE_ENV is production", async () => {
    process.env.NODE_ENV = "production";
    const mockPrisma: any = {
      user: { deleteMany: jest.fn() },
      payment: { deleteMany: jest.fn() },
      booking: { deleteMany: jest.fn() },
    };

    await expect(resetAndSeedDevelopmentData(mockPrisma)).rejects.toThrow(
      /FATAL: Destructive database reset and demo data seeding cannot be executed in production environment/
    );

    expect(mockPrisma.user.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.payment.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.booking.deleteMany).not.toHaveBeenCalled();
  });

  it("should execute non-destructive master data upserts in production mode", async () => {
    process.env.NODE_ENV = "production";
    const mockPrisma: any = {
      user: {
        upsert: jest.fn().mockResolvedValue({ id: "super-admin-id" }),
        deleteMany: jest.fn(),
      },
      temple: {
        findFirst: jest.fn().mockResolvedValue({ id: "temple-1", name: "Sri Venkateswara Temple" }),
        deleteMany: jest.fn(),
      },
      templeInformation: {
        upsert: jest.fn().mockResolvedValue({ id: "info-1" }),
        deleteMany: jest.fn(),
      },
      deity: {
        findFirst: jest.fn().mockResolvedValue({ id: "deity-1" }),
        deleteMany: jest.fn(),
      },
      aartiSchedule: {
        findFirst: jest.fn().mockResolvedValue({ id: "aarti-1" }),
        deleteMany: jest.fn(),
      },
      donationCause: {
        upsert: jest.fn().mockResolvedValue({ id: "cause-1" }),
        deleteMany: jest.fn(),
      },
      gurukul: {
        findFirst: jest.fn().mockResolvedValue({ id: "gurukul-1" }),
        deleteMany: jest.fn(),
      },
      paath: {
        findFirst: jest.fn().mockResolvedValue({ id: "paath-1" }),
        deleteMany: jest.fn(),
      },
      booking: { deleteMany: jest.fn() },
      payment: { deleteMany: jest.fn() },
      paymentEvent: { deleteMany: jest.fn() },
    };

    const result = await seedProductionMasterData(mockPrisma);

    expect(result).toEqual({ templeId: "temple-1", superAdminId: "super-admin-id" });
    expect(mockPrisma.user.upsert).toHaveBeenCalled();
    expect(mockPrisma.donationCause.upsert).toHaveBeenCalled();

    // Verify ZERO destructive deleteMany calls were made
    expect(mockPrisma.user.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.booking.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.payment.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.paymentEvent.deleteMany).not.toHaveBeenCalled();
  });
});
