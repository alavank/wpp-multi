import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assertCanAccessDepartment } from "../../lib/authorize.js";
import fs from "node:fs/promises";
import { recordOutboundMedia, recordOutboundText } from "./messages.service.js";
import { getWhatsappManager } from "../whatsapp/session-manager.js";

const listQuery = z.object({
  conversationId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

const sendBody = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(4096),
});

const sendMediaBody = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(["IMAGE", "AUDIO", "VIDEO", "DOCUMENT", "INSTANT_VIDEO"]),
  mediaId: z.string().uuid(),
  caption: z.string().max(1024).optional(),
});

export const messagesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req, reply) => {
    const q = listQuery.parse(req.query);
    const conv = await app.prisma.conversation.findUnique({
      where: { id: q.conversationId },
      select: { id: true, departmentId: true },
    });
    if (!conv) return reply.notFound();
    if (!assertCanAccessDepartment(req, reply, conv.departmentId)) return;

    const items = await app.prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { sentAt: "desc" },
      take: q.limit,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: {
        media: true,
        sender: { select: { id: true, fullName: true, photoUrl: true } },
      },
    });
    return { items: items.reverse() };
  });

  app.post("/", async (req, reply) => {
    const data = sendBody.parse(req.body);
    const conv = await app.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      include: { contact: true },
    });
    if (!conv) return reply.notFound();
    if (!assertCanAccessDepartment(req, reply, conv.departmentId)) return;
    if (conv.status !== "IN_PROGRESS" || conv.assignedAgentId !== req.auth.id) {
      return reply.forbidden(
        "Só é possível enviar mensagem em conversas IN_PROGRESS atribuídas a você.",
      );
    }

    // Envia via Baileys (best-effort) e persiste com prefixo, no mesmo trecho.
    const mgr = getWhatsappManager();
    let whatsappMessageId: string | undefined;
    try {
      const result = await mgr.sendText(conv.departmentId, conv.contact.phoneE164, {
        prefix: `${req.auth.fullName} disse: `,
        body: data.body,
      });
      whatsappMessageId = result?.id;
    } catch (err) {
      app.log.error({ err }, "[messages] falha ao enviar via Baileys");
    }

    const saved = await recordOutboundText(app.prisma, {
      conversationId: conv.id,
      senderUserId: req.auth.id,
      senderFullName: req.auth.fullName,
      body: data.body,
      whatsappMessageId,
    });

    await app.prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: saved.sentAt },
    });

    return saved;
  });

  app.post("/media", async (req, reply) => {
    const data = sendMediaBody.parse(req.body);
    const conv = await app.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      include: { contact: true },
    });
    if (!conv) return reply.notFound();
    if (!assertCanAccessDepartment(req, reply, conv.departmentId)) return;
    if (conv.status !== "IN_PROGRESS" || conv.assignedAgentId !== req.auth.id) {
      return reply.forbidden();
    }

    const media = await app.prisma.mediaAsset.findUnique({ where: { id: data.mediaId } });
    if (!media) return reply.notFound("MediaAsset não encontrado.");

    const buffer = await fs.readFile(media.localPath);
    const mgr = getWhatsappManager();
    let whatsappMessageId: string | undefined;
    try {
      const result = await mgr.sendMedia(conv.departmentId, conv.contact.phoneE164, {
        type: data.type,
        buffer,
        mimeType: media.mimeType,
        caption: data.caption ? `${req.auth.fullName} disse: ${data.caption}` : undefined,
      });
      whatsappMessageId = result?.id;
    } catch (err) {
      app.log.error({ err }, "[messages/media] falha ao enviar via Baileys");
    }

    const saved = await recordOutboundMedia(app.prisma, {
      conversationId: conv.id,
      senderUserId: req.auth.id,
      senderFullName: req.auth.fullName,
      type: data.type,
      mediaId: data.mediaId,
      caption: data.caption,
      whatsappMessageId,
    });

    await app.prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: saved.sentAt },
    });

    return saved;
  });
};
