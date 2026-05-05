import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const listQuery = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().max(120).optional(),
  departmentId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().uuid().optional(),
});

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req, reply) => {
    const allowed =
      req.auth.role === "SUPER_ADMIN" ||
      (await req.audit.hasPermission("AUDIT_VIEW"));
    if (!allowed) return reply.forbidden();

    const q = listQuery.parse(req.query);
    const items = await app.prisma.auditLog.findMany({
      where: {
        ...(q.userId ? { actorUserId: q.userId } : {}),
        ...(q.action ? { action: q.action } : {}),
        ...(q.departmentId ? { departmentId: q.departmentId } : {}),
        ...(q.from || q.to
          ? {
              createdAt: {
                ...(q.from ? { gte: q.from } : {}),
                ...(q.to ? { lte: q.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: q.limit,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    return { items };
  });
};
