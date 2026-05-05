import fp from "fastify-plugin";
import type { Permission } from "@prisma/client";

export type AuditEmitInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  departmentId?: string;
  metadata?: Record<string, unknown>;
};

declare module "fastify" {
  interface FastifyRequest {
    audit: {
      emit: (input: AuditEmitInput) => Promise<void>;
      hasPermission: (perm: Permission, departmentId?: string | null) => Promise<boolean>;
    };
  }
}

function parseDevice(ua: string | undefined): string | undefined {
  if (!ua) return undefined;
  // Heurística leve sem dependência externa.
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) return "mobile";
  if (/Windows|Mac OS|Linux|X11/i.test(ua)) return "desktop";
  return "unknown";
}

function clientIp(req: import("fastify").FastifyRequest): string | undefined {
  // honra X-Forwarded-For (uso comum atrás de nginx/cloudflare)
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0]!.trim();
  }
  return req.ip;
}

export const auditPlugin = fp(async (app) => {
  app.addHook("preHandler", async (req) => {
    const ip = clientIp(req);
    const userAgent = (req.headers["user-agent"] as string | undefined) ?? undefined;
    const device = parseDevice(userAgent);
    const location = (req.headers["x-geo"] as string | undefined) ?? undefined;

    req.audit = {
      emit: async (input) => {
        // se não há usuário autenticado ainda, ainda assim registra (login attempts etc.)
        const actor = req.auth ?? null;
        await app.prisma.auditLog.create({
          data: {
            actorUserId: actor?.id,
            actorName: actor?.fullName,
            departmentId: input.departmentId,
            action: input.action,
            entityType: input.entityType ?? "system",
            entityId: input.entityId,
            metadata: (input.metadata ?? {}) as object,
            ipAddress: ip,
            userAgent,
            device,
            location,
          },
        });
      },
      hasPermission: async (perm, departmentId) => {
        if (!req.auth) return false;
        if (req.auth.role === "SUPER_ADMIN") return true;
        const grants = await app.prisma.userPermission.findMany({
          where: { userId: req.auth.id, permission: perm },
          select: { departmentId: true },
        });
        if (grants.length === 0) return false;
        // grant global (departmentId null) sempre permite; senão precisa bater com o departamento
        if (grants.some((g) => g.departmentId === null)) return true;
        if (!departmentId) return false;
        return grants.some((g) => g.departmentId === departmentId);
      },
    };
  });
});
