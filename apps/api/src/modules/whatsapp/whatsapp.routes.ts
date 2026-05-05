import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import qrcode from "qrcode";
import { getWhatsappManager } from "./session-manager.js";
import { assertCanAccessDepartment, assertRole } from "../../lib/authorize.js";

export const whatsappRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.post("/sessions/:departmentId/start", async (req, reply) => {
    const { departmentId } = z
      .object({ departmentId: z.string().uuid() })
      .parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    if (!assertCanAccessDepartment(req, reply, departmentId)) return;

    await app.prisma.whatsappSession.upsert({
      where: { departmentId },
      update: {},
      create: { departmentId, authPath: departmentId },
    });

    const mgr = getWhatsappManager();
    mgr.attachLogger(app.log);
    await mgr.start(departmentId);
    return { ok: true };
  });

  app.post("/sessions/:departmentId/stop", async (req, reply) => {
    const { departmentId } = z
      .object({ departmentId: z.string().uuid() })
      .parse(req.params);
    if (!assertRole(req, reply, "SUPER_ADMIN", "DEPT_ADMIN")) return;
    if (!assertCanAccessDepartment(req, reply, departmentId)) return;
    await getWhatsappManager().stop(departmentId);
    return { ok: true };
  });

  app.get("/sessions/:departmentId", async (req, reply) => {
    const { departmentId } = z
      .object({ departmentId: z.string().uuid() })
      .parse(req.params);
    if (!assertCanAccessDepartment(req, reply, departmentId)) return;

    const session = await app.prisma.whatsappSession.findUnique({
      where: { departmentId },
    });
    if (!session) return reply.notFound();
    return session;
  });

  app.get("/sessions/:departmentId/qr.png", async (req, reply) => {
    const { departmentId } = z
      .object({ departmentId: z.string().uuid() })
      .parse(req.params);
    if (!assertCanAccessDepartment(req, reply, departmentId)) return;

    const session = await app.prisma.whatsappSession.findUnique({
      where: { departmentId },
    });
    const qr = getWhatsappManager().getQrCode(departmentId) ?? session?.lastQrCode;
    if (!qr) return reply.notFound("QR ainda não disponível.");
    const png = await qrcode.toBuffer(qr, { type: "png", width: 320 });
    reply.type("image/png");
    return png;
  });
};
