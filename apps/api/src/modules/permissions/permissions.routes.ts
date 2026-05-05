import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assertRole } from "../../lib/authorize.js";

const PERMISSIONS = [
  "CONVERSATION_VIEW",
  "CONVERSATION_ASSUME",
  "CONVERSATION_FINISH",
  "CONVERSATION_REOPEN",
  "MESSAGE_SEND",
  "MESSAGE_SEND_MEDIA",
  "TRANSFER_CREATE",
  "TRANSFER_RESPOND",
  "SCHEDULED_RETURN_CREATE",
  "SCHEDULED_RETURN_CANCEL",
  "CONTACT_EDIT",
  "CONTACT_NOTE_WRITE",
  "GROUP_VIEW",
  "WHATSAPP_SESSION_MANAGE",
  "USER_MANAGE",
  "DEPARTMENT_MANAGE",
  "AUDIT_VIEW",
  "MONITOR_VIEW",
] as const;

const grantBody = z.object({
  userId: z.string().uuid(),
  permission: z.enum(PERMISSIONS),
  departmentId: z.string().uuid().nullable().optional(),
});

export const permissionsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/catalog", async () => ({ permissions: PERMISSIONS }));

  app.get("/user/:userId", async (req, reply) => {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params);
    const isSelf = userId === req.auth.id;
    if (!isSelf && !assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    const items = await app.prisma.userPermission.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return { items };
  });

  app.post("/grant", async (req, reply) => {
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    const data = grantBody.parse(req.body);

    // DEPT_ADMIN só concede permissões dentro dos departamentos que administra
    if (req.auth.role === "DEPT_ADMIN") {
      if (!data.departmentId || !req.auth.departmentIds.includes(data.departmentId)) {
        return reply.forbidden("DEPT_ADMIN só pode conceder em seus departamentos.");
      }
    }

    // Postgres permite múltiplos NULLs em unique index, e o tipo composto do
    // Prisma exige não-nulo no `where` — então fazemos upsert manual.
    const existing = await app.prisma.userPermission.findFirst({
      where: {
        userId: data.userId,
        permission: data.permission,
        departmentId: data.departmentId ?? null,
      },
    });
    const created = existing
      ? await app.prisma.userPermission.update({
          where: { id: existing.id },
          data: { grantedById: req.auth.id },
        })
      : await app.prisma.userPermission.create({
          data: {
            userId: data.userId,
            permission: data.permission,
            departmentId: data.departmentId ?? null,
            grantedById: req.auth.id,
          },
        });

    await req.audit.emit({
      action: "permission.grant",
      entityType: "user_permission",
      entityId: created.id,
      departmentId: data.departmentId ?? undefined,
      metadata: { userId: data.userId, permission: data.permission },
    });
    return created;
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    const existing = await app.prisma.userPermission.findUnique({ where: { id } });
    if (!existing) return reply.notFound();

    if (
      req.auth.role === "DEPT_ADMIN" &&
      (!existing.departmentId || !req.auth.departmentIds.includes(existing.departmentId))
    ) {
      return reply.forbidden();
    }

    await app.prisma.userPermission.delete({ where: { id } });
    await req.audit.emit({
      action: "permission.revoke",
      entityType: "user_permission",
      entityId: id,
      departmentId: existing.departmentId ?? undefined,
      metadata: { userId: existing.userId, permission: existing.permission },
    });
    return { ok: true };
  });
};
