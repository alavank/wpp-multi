import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assertRole } from "../../lib/authorize.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

const createBody = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  photoUrl: z.string().url().optional(),
  role: z.enum(["SUPER_ADMIN", "DEPT_ADMIN", "AGENT"]),
  password: z.string().min(8),
  departmentIds: z.array(z.string().uuid()).default([]),
});

const updateBody = z.object({
  fullName: z.string().min(2).max(120).optional(),
  photoUrl: z.string().url().nullable().optional(),
  role: z.enum(["SUPER_ADMIN", "DEPT_ADMIN", "AGENT"]).optional(),
  isActive: z.boolean().optional(),
  departmentIds: z.array(z.string().uuid()).optional(),
});

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/me", async (req) => {
    return req.auth;
  });

  /** Notifica o backend que o usuário acabou de logar (audit). */
  app.post("/login-event", async (req) => {
    await req.audit.emit({
      action: "user.login",
      entityType: "user",
      entityId: req.auth.id,
    });
    return { ok: true };
  });

  app.get("/", async (req, reply) => {
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    const items = await app.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { fullName: "asc" },
      include: { memberships: { select: { departmentId: true } } },
    });
    return {
      items: items.map((u) => ({
        ...u,
        departmentIds: u.memberships.map((m) => m.departmentId),
      })),
    };
  });

  // Cria usuário no Supabase Auth e o perfil em public.users no mesmo passo.
  app.post("/", async (req, reply) => {
    if (!assertRole(req, reply, "SUPER_ADMIN")) return;
    const data = createBody.parse(req.body);

    if (data.role === "AGENT" && !data.photoUrl) {
      return reply.badRequest("Atendentes exigem foto.");
    }

    const supa = getSupabaseAdmin();
    const { data: created, error } = await supa.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, avatar_url: data.photoUrl },
      app_metadata: { role: data.role },
    });
    if (error || !created.user) return reply.internalServerError(error?.message);

    return app.prisma.user.create({
      data: {
        id: created.user.id,
        email: data.email,
        fullName: data.fullName,
        photoUrl: data.photoUrl,
        role: data.role,
        memberships: {
          create: data.departmentIds.map((departmentId) => ({ departmentId })),
        },
      },
    });
  });

  app.patch("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    const data = updateBody.parse(req.body);

    return app.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          fullName: data.fullName,
          photoUrl: data.photoUrl,
          role: data.role,
          isActive: data.isActive,
        },
      });
      if (data.departmentIds) {
        await tx.departmentMember.deleteMany({ where: { userId: id } });
        await tx.departmentMember.createMany({
          data: data.departmentIds.map((departmentId) => ({
            userId: id,
            departmentId,
          })),
        });
      }
      return updated;
    });
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN")) return;
    await app.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    // Não deletamos o auth.users — apenas marcamos inativo.
    return { ok: true };
  });
};
