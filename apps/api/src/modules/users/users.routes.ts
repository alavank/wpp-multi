import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assertRole } from "../../lib/authorize.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

const cpfRegex = /^\d{11}$/;

const createBody = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  cpf: z.string().regex(cpfRegex, "CPF deve conter 11 dígitos numéricos"),
  photoUrl: z.string().url().nullable().optional(),
  role: z.enum(["SUPER_ADMIN", "DEPT_ADMIN", "AGENT"]),
  password: z.string().min(8),
  departmentIds: z.array(z.string().uuid()).default([]),
});

const updateBody = z.object({
  fullName: z.string().min(2).max(120).optional(),
  cpf: z.string().regex(cpfRegex).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  role: z.enum(["SUPER_ADMIN", "DEPT_ADMIN", "AGENT"]).optional(),
  isActive: z.boolean().optional(),
  departmentIds: z.array(z.string().uuid()).optional(),
});

const selfUpdateBody = z.object({
  fullName: z.string().min(2).max(120).optional(),
  bio: z.string().max(500).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
});

const AVATAR_BUCKET = "avatars";

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/me", async (req) => {
    const u = await app.prisma.user.findUnique({
      where: { id: req.auth.id },
      include: { memberships: { select: { departmentId: true } } },
    });
    return {
      ...req.auth,
      cpf: u?.cpf ?? null,
      bio: u?.bio ?? null,
      photoUrl: u?.photoUrl ?? null,
    };
  });

  /** Atendente atualiza o próprio perfil (foto, bio, nome). */
  app.patch("/me", async (req) => {
    const data = selfUpdateBody.parse(req.body);
    return app.prisma.user.update({ where: { id: req.auth.id }, data });
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
    const isSuper = req.auth.role === "SUPER_ADMIN";

    const items = await app.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(isSuper
          ? {}
          : {
              // DEPT_ADMIN só vê quem está em pelo menos um dos departamentos dele
              memberships: {
                some: { departmentId: { in: req.auth.departmentIds } },
              },
            }),
      },
      orderBy: { fullName: "asc" },
      include: { memberships: { select: { departmentId: true } } },
    });
    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        photoUrl: u.photoUrl,
        cpf: u.cpf,
        bio: u.bio,
        role: u.role,
        isActive: u.isActive,
        departmentIds: u.memberships.map((m) => m.departmentId),
      })),
    };
  });

  // Cria usuário no Supabase Auth e o perfil em public.users no mesmo passo.
  // SUPER_ADMIN: pode criar qualquer role.
  // DEPT_ADMIN:  pode criar apenas AGENT vinculado aos departamentos dele.
  app.post("/", async (req, reply) => {
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    const data = createBody.parse(req.body);

    if (req.auth.role === "DEPT_ADMIN") {
      if (data.role !== "AGENT") {
        return reply.forbidden("DEPT_ADMIN só pode cadastrar Atendentes.");
      }
      const allowed = req.auth.departmentIds;
      if (
        data.departmentIds.length === 0 ||
        data.departmentIds.some((id) => !allowed.includes(id))
      ) {
        return reply.forbidden(
          "Vincule somente departamentos sob sua administração.",
        );
      }
    }

    // Foto não é obrigatória aqui — o front faz o upload em /users/:id/avatar
    // logo depois da criação. Atendentes sem foto recebem placeholder visual
    // (iniciais coloridas) até carregarem a sua.

    const supa = getSupabaseAdmin();
    const { data: created, error } = await supa.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, avatar_url: data.photoUrl },
      app_metadata: { role: data.role },
    });
    if (error || !created.user) return reply.internalServerError(error?.message);

    const user = await app.prisma.user.create({
      data: {
        id: created.user.id,
        email: data.email,
        fullName: data.fullName,
        cpf: data.cpf,
        photoUrl: data.photoUrl ?? null,
        role: data.role,
        memberships: {
          create: data.departmentIds.map((departmentId) => ({ departmentId })),
        },
      },
    });

    await req.audit.emit({
      action: "user.create",
      entityType: "user",
      entityId: user.id,
      metadata: { role: data.role, departmentIds: data.departmentIds },
    });

    return user;
  });

  app.patch("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    const data = updateBody.parse(req.body);

    if (req.auth.role === "DEPT_ADMIN") {
      // Garante que esse usuário está sob os departamentos do admin
      const target = await app.prisma.user.findUnique({
        where: { id },
        include: { memberships: { select: { departmentId: true } } },
      });
      const targetDepts = target?.memberships.map((m) => m.departmentId) ?? [];
      const overlap = targetDepts.some((d) => req.auth.departmentIds.includes(d));
      if (!overlap) return reply.forbidden();

      // Não pode mudar role nem mexer em departamentos fora do escopo
      if (data.role && data.role !== "AGENT") {
        return reply.forbidden("DEPT_ADMIN não altera roles superiores.");
      }
      if (data.departmentIds) {
        const allowed = req.auth.departmentIds;
        if (data.departmentIds.some((d) => !allowed.includes(d))) {
          return reply.forbidden();
        }
      }
    }

    return app.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          fullName: data.fullName,
          cpf: data.cpf,
          bio: data.bio,
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
    await req.audit.emit({
      action: "user.delete",
      entityType: "user",
      entityId: id,
    });
    return { ok: true };
  });

  /**
   * Upload de avatar — recebe binário (≤ 200KB; o front já redimensiona),
   * salva no bucket `avatars` do Supabase Storage e devolve a URL pública.
   *
   * O usuário só pode subir o próprio avatar; admins podem subir para qualquer.
   */
  app.put("/:id/avatar", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const isSelf = req.auth.id === id;
    const isAdmin = req.auth.role === "SUPER_ADMIN" || req.auth.role === "DEPT_ADMIN";
    if (!isSelf && !isAdmin) return reply.forbidden();

    const contentType = (req.headers["content-type"] as string | undefined) ?? "";
    if (!contentType.startsWith("image/")) {
      return reply.badRequest("Content-Type precisa ser image/*");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req.raw) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    if (buf.length === 0) return reply.badRequest("Corpo vazio.");
    if (buf.length > 250 * 1024) {
      return reply.payloadTooLarge("Avatar acima de 250KB.");
    }

    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const objectName = `${id}/${Date.now()}.${ext}`;

    const supa = getSupabaseAdmin();
    const { error: uploadErr } = await supa.storage
      .from(AVATAR_BUCKET)
      .upload(objectName, buf, {
        contentType,
        upsert: true,
        cacheControl: "31536000",
      });
    if (uploadErr) {
      return reply.internalServerError(`storage: ${uploadErr.message}`);
    }

    const { data: pub } = supa.storage.from(AVATAR_BUCKET).getPublicUrl(objectName);
    const photoUrl = pub.publicUrl;

    const updated = await app.prisma.user.update({
      where: { id },
      data: { photoUrl },
    });

    // Espelha no auth.users.user_metadata.avatar_url para ficar coerente com o JWT.
    await supa.auth.admin
      .updateUserById(id, { user_metadata: { avatar_url: photoUrl } })
      .catch(() => undefined);

    await req.audit.emit({
      action: "user.avatar_update",
      entityType: "user",
      entityId: id,
    });

    return { id: updated.id, photoUrl };
  });
};
