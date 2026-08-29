import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";

@Injectable()
export class TempleAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Unauthenticated requests or devotees pass through (handled by JwtAuthGuard / devotee policies)
    if (!user || user.role === "DEVOTEE") {
      return true;
    }

    // SUPER_ADMIN has unrestricted global multi-temple access
    if (user.role === "SUPER_ADMIN") {
      return true;
    }

    // Extract target templeId candidates from route params, query string, request body, or header
    const candidates: string[] = [];
    if (request.params?.templeId) candidates.push(String(request.params.templeId));
    if (request.query?.templeId) candidates.push(String(request.query.templeId));
    if (request.body?.templeId) candidates.push(String(request.body.templeId));
    if (request.headers?.["x-temple-id"]) candidates.push(String(request.headers["x-temple-id"]));

    const uniqueTempleIds = Array.from(new Set(candidates.filter(Boolean)));

    // If no templeId is targeted by the request, allow
    if (uniqueTempleIds.length === 0) {
      return true;
    }

    // For ADMIN, MANAGER, STAFF: verify explicit assignment in StaffAssignment for all targeted temple IDs
    for (const targetTempleId of uniqueTempleIds) {
      const assignment = await this.prisma.staffAssignment.findUnique({
        where: {
          userId_templeId: {
            userId: user.id,
            templeId: targetTempleId,
          },
        },
      });

      if (!assignment) {
        throw new ForbiddenException(
          "Access denied: You are not assigned to manage this temple."
        );
      }
    }

    return true;
  }
}
