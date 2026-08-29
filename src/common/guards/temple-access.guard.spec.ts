import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { TempleAccessGuard } from "./temple-access.guard";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { Role } from "@prisma/client";

describe("TempleAccessGuard", () => {
  let guard: TempleAccessGuard;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      staffAssignment: {
        findUnique: jest.fn(),
      },
    };
    guard = new TempleAccessGuard(mockPrisma as PrismaService);
  });

  function createMockContext(user: any, params: any = {}, query: any = {}, body: any = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          query,
          body,
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;
  }

  describe("DEVOTEE Role", () => {
    it("should allow DEVOTEE users to pass through without requiring StaffAssignment", async () => {
      const context = createMockContext({ id: "devotee-1", role: Role.DEVOTEE }, { templeId: "temple-1" });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.staffAssignment.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("SUPER_ADMIN Role", () => {
    it("should allow SUPER_ADMIN unrestricted access to any temple without checking StaffAssignment", async () => {
      const context = createMockContext({ id: "super-1", role: Role.SUPER_ADMIN }, { templeId: "temple-999" });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.staffAssignment.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("STAFF / MANAGER / ADMIN Roles", () => {
    it("should allow access when STAFF member is explicitly assigned to target temple via params", async () => {
      mockPrisma.staffAssignment.findUnique.mockResolvedValue({
        id: "assign-1",
        userId: "staff-1",
        templeId: "temple-1",
      });

      const context = createMockContext({ id: "staff-1", role: Role.STAFF }, { templeId: "temple-1" });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.staffAssignment.findUnique).toHaveBeenCalledWith({
        where: {
          userId_templeId: {
            userId: "staff-1",
            templeId: "temple-1",
          },
        },
      });
    });

    it("should allow access when MANAGER member is assigned to target temple via query or body", async () => {
      mockPrisma.staffAssignment.findUnique.mockResolvedValue({
        id: "assign-2",
        userId: "mgr-1",
        templeId: "temple-2",
      });

      const context = createMockContext({ id: "mgr-1", role: Role.MANAGER }, {}, { templeId: "temple-2" });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.staffAssignment.findUnique).toHaveBeenCalledWith({
        where: {
          userId_templeId: {
            userId: "mgr-1",
            templeId: "temple-2",
          },
        },
      });
    });

    it("should throw ForbiddenException when STAFF member is NOT assigned to the requested temple", async () => {
      mockPrisma.staffAssignment.findUnique.mockResolvedValue(null);

      const context = createMockContext({ id: "staff-1", role: Role.STAFF }, { templeId: "temple-unassigned" });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        "Access denied: You are not assigned to manage this temple."
      );
    });

    it("should prevent cross-temple IDOR when staff assigned to temple-1 attempts to modify temple-2", async () => {
      // Staff has assignment for temple-1, but request targets temple-2
      mockPrisma.staffAssignment.findUnique.mockImplementation(({ where }: any) => {
        if (where.userId_templeId.userId === "staff-1" && where.userId_templeId.templeId === "temple-1") {
          return Promise.resolve({ id: "assign-1", userId: "staff-1", templeId: "temple-1" });
        }
        return Promise.resolve(null);
      });

      const context = createMockContext({ id: "staff-1", role: Role.STAFF }, { templeId: "temple-2" });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it("should prevent IDOR when conflicting temple IDs are supplied across params and body", async () => {
      // Staff is assigned to temple-1, but body targets temple-2
      mockPrisma.staffAssignment.findUnique.mockImplementation(({ where }: any) => {
        if (where.userId_templeId.userId === "staff-1" && where.userId_templeId.templeId === "temple-1") {
          return Promise.resolve({ id: "assign-1", userId: "staff-1", templeId: "temple-1" });
        }
        return Promise.resolve(null);
      });

      const context = createMockContext(
        { id: "staff-1", role: Role.STAFF },
        { templeId: "temple-1" }, // params: assigned
        {},
        { templeId: "temple-2" }, // body: unassigned
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it("should allow non-temple-scoped requests when templeId is not present", async () => {
      const context = createMockContext({ id: "staff-1", role: Role.STAFF });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.staffAssignment.findUnique).not.toHaveBeenCalled();
    });
  });
});
