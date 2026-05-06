import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assertRole } from "../../lib/authorize.js";

const createBody = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  /** Texto livre que classifica o nó: ORGANIZACAO, SECRETARIA, DEPARTAMENTO, SETOR, … */
  kind: z.string().min(1).max(40).default("DEPARTAMENTO"),
  parentId: z.string().uuid().nullable().optional(),
  whatsappNumber: z
    .string()
    .regex(/^\+\d{8,15}$/)
    .nullable()
    .optional(),
});

const updateBody = createBody.partial().extend({
  isActive: z.boolean().optional(),
});

export const departmentsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  /**
   * Lista lisa, ordenada por (parentId, name). O front monta a árvore.
   * SUPER_ADMIN vê tudo; demais veem somente os nós onde têm membership
   * (e seus ancestrais, para que a árvore fique navegável).
   */
  app.get("/", async (req) => {
    const all = await app.prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });

    if (req.auth.role === "SUPER_ADMIN") return { items: all };

    const allowed = new Set<string>(req.auth.departmentIds);
    // Inclui ancestrais para a árvore não ficar quebrada.
    let changed = true;
    const byId = new Map(all.map((d) => [d.id, d]));
    while (changed) {
      changed = false;
      for (const id of allowed) {
        const node = byId.get(id);
        if (node?.parentId && !allowed.has(node.parentId)) {
          allowed.add(node.parentId);
          changed = true;
        }
      }
    }
    return { items: all.filter((d) => allowed.has(d.id)) };
  });

  app.post("/", async (req, reply) => {
    if (!assertRole(req, reply, "SUPER_ADMIN")) return;
    const data = createBody.parse(req.body);
    const created = await app.prisma.department.create({
      data: {
        name: data.name,
        description: data.description,
        kind: data.kind,
        parentId: data.parentId ?? null,
        whatsappNumber: data.whatsappNumber ?? null,
      },
    });
    await req.audit.emit({
      action: "department.create",
      entityType: "department",
      entityId: created.id,
      metadata: { kind: created.kind, parentId: created.parentId },
    });
    return created;
  });

  app.patch("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    if (req.auth.role !== "SUPER_ADMIN" && !req.auth.departmentIds.includes(id)) {
      return reply.forbidden();
    }
    const data = updateBody.parse(req.body);

    // Evita loop: parent não pode apontar para o próprio nó (ou descendente).
    if (data.parentId && data.parentId === id) {
      return reply.badRequest("Um nó não pode ser pai de si mesmo.");
    }

    const updated = await app.prisma.department.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        kind: data.kind,
        parentId: data.parentId,
        whatsappNumber: data.whatsappNumber,
        isActive: data.isActive,
      },
    });
    await req.audit.emit({
      action: "department.update",
      entityType: "department",
      entityId: id,
      metadata: data,
    });
    return updated;
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN")) return;
    await app.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await req.audit.emit({
      action: "department.delete",
      entityType: "department",
      entityId: id,
    });
    return { ok: true };
  });
};
