import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assertRole } from "../../lib/authorize.js";

const createBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  whatsappNumber: z.string().regex(/^\+\d{8,15}$/),
  secretariaId: z.string().uuid().nullable().optional(),
});

const updateBody = createBody.partial().extend({
  isActive: z.boolean().optional(),
});

export const departmentsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const isAdmin = req.auth.role === "SUPER_ADMIN";
    const items = await app.prisma.department.findMany({
      where: {
        deletedAt: null,
        ...(isAdmin ? {} : { id: { in: req.auth.departmentIds } }),
      },
      orderBy: { name: "asc" },
      include: {
        secretaria: { select: { id: true, name: true } },
      },
    });
    return { items };
  });

  app.post("/", async (req, reply) => {
    if (!assertRole(req, reply, "SUPER_ADMIN")) return;
    const data = createBody.parse(req.body);
    return app.prisma.department.create({ data });
  });

  app.patch("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    if (req.auth.role !== "SUPER_ADMIN" && !req.auth.departmentIds.includes(id)) {
      return reply.forbidden();
    }
    const data = updateBody.parse(req.body);
    return app.prisma.department.update({ where: { id }, data });
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN")) return;
    return app.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  });
};
