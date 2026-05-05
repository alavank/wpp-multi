import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assertCanAccessDepartment } from "../../lib/authorize.js";
import { recordOutboundText } from "../messages/messages.service.js";
import { getWhatsappManager } from "../whatsapp/session-manager.js";

const createBody = z.object({
  conversationId: z.string().uuid(),
  scheduledFor: z.coerce.date(),
  subject: z.string().min(1).max(500),
  notifyOnSave: z.boolean().default(false),
});

const listQuery = z.object({
  status: z.enum(["PENDING", "NOTIFIED", "DONE", "CANCELLED"]).optional(),
  mine: z.coerce.boolean().optional(),
});

export const scheduledReturnsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const q = listQuery.parse(req.query);
    const items = await app.prisma.scheduledReturn.findMany({
      where: {
        ...(q.status ? { status: q.status } : {}),
        ...(q.mine ? { agentId: req.auth.id } : {}),
      },
      orderBy: { scheduledFor: "asc" },
      take: 100,
      include: {
        contact: { select: { id: true, displayName: true, phoneE164: true } },
        agent: { select: { id: true, fullName: true } },
      },
    });
    return { items };
  });

  app.post("/", async (req, reply) => {
    const data = createBody.parse(req.body);
    const conv = await app.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      include: { contact: true },
    });
    if (!conv) return reply.notFound();
    if (!assertCanAccessDepartment(req, reply, conv.departmentId)) return;

    const created = await app.prisma.scheduledReturn.create({
      data: {
        conversationId: conv.id,
        contactId: conv.contactId,
        agentId: req.auth.id,
        scheduledFor: data.scheduledFor,
        subject: data.subject,
        notifyOnSave: data.notifyOnSave,
      },
    });
    await req.audit.emit({
      action: "scheduled_return.create",
      entityType: "scheduled_return",
      entityId: created.id,
      departmentId: conv.departmentId,
      metadata: { scheduledFor: data.scheduledFor, notifyOnSave: data.notifyOnSave },
    });

    if (data.notifyOnSave) {
      const when = data.scheduledFor.toLocaleString("pt-BR");
      const text = `Olá! Confirmamos seu retorno agendado para ${when}. Assunto: ${data.subject}`;

      try {
        const mgr = getWhatsappManager();
        const result = await mgr.sendText(conv.departmentId, conv.contact.phoneE164, {
          prefix: `${req.auth.fullName} disse: `,
          body: text,
        });
        await recordOutboundText(app.prisma, {
          conversationId: conv.id,
          senderUserId: req.auth.id,
          senderFullName: req.auth.fullName,
          body: text,
          whatsappMessageId: result?.id,
        });
      } catch (err) {
        app.log.error({ err }, "[scheduled-returns] falha ao enviar confirmação");
      }
    }

    return created;
  });

  app.post("/:id/cancel", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const sr = await app.prisma.scheduledReturn.findUnique({ where: { id } });
    if (!sr) return reply.notFound();
    if (sr.agentId !== req.auth.id && req.auth.role === "AGENT") {
      return reply.forbidden();
    }
    return app.prisma.scheduledReturn.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  });
};
