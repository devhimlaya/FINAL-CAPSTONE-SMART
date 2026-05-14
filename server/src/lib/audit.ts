import { AuditAction, AuditSeverity, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { broadcastLog } from "./sseManager";

export async function createAuditLog(
  action: AuditAction,
  user: { id?: string | null; firstName?: string | null; lastName?: string | null; role: string },
  target: string,
  targetType: string,
  details: string,
  ipAddress?: string,
  severity: AuditSeverity = AuditSeverity.INFO,
  targetId?: string,
  metadata?: object
) {
  const userId = user.id && user.id !== "unknown" ? user.id : undefined;
  const data = {
    action,
    userId,
    userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.role,
    userRole: user.role,
    target,
    targetType,
    targetId,
    details,
    ipAddress,
    severity,
    metadata: metadata || undefined,
  };

  let log;

  try {
    log = await prisma.auditLog.create({ data });
  } catch (error) {
    // If a caller passes an ID that no longer exists, keep auth/actions working and write an anonymous audit log.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      log = await prisma.auditLog.create({
        data: {
          ...data,
          userId: undefined,
        },
      });
    } else {
      throw error;
    }
  }

  // Push to all connected SSE admin clients
  broadcastLog({
    id: log.id,
    action: log.action.toLowerCase(),
    user: log.userName,
    userRole: log.userRole,
    target: log.target,
    targetType: log.targetType,
    details: log.details,
    ipAddress: log.ipAddress,
    severity: log.severity.toLowerCase(),
    timestamp: log.createdAt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    date: log.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    createdAt: log.createdAt,
  });
}
