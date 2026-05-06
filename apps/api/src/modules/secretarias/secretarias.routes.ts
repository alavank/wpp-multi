import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assertRole } from "../../lib/authorize.js";

const createBody = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(500).optional(),
});

const updateBody = createBody.partial().extend({
  isActive: z.boolean().optional(),
});

export const secretariasRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  // Lista — visível para qualquer autenticado (filtros granulares ficam por conta da UI).
  app.get("/", async () => {
    const items = await app.prisma.secretaria.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { departments: true, users: true } },
      },
    });
    return { items };
  });

  app.post("/", async (req, reply) => {
    if (!assertRole(req, reply, "SUPER_ADMIN")) return;
    const data = createBody.parse(req.body);
    const created = await app.prisma.secretaria.create({ data });
    await req.audit.emit({
      action: "secretaria.create",
      entityType: "secretaria",
      entityId: created.id,
      metadata: { name: created.name },
    });
    return created;
  });

  app.patch("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN")) return;
    const data = updateBody.parse(req.body);
    const updated = await app.prisma.secretaria.update({ where: { id }, data });
    await req.audit.emit({
      action: "secretaria.update",
      entityType: "secretaria",
      entityId: id,
      metadata: data,
    });
    return updated;
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN")) return;
    await app.prisma.secretaria.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await req.audit.emit({
      action: "secretaria.delete",
      entityType: "secretaria",
      entityId: id,
    });
    return { ok: true };
  });
};
