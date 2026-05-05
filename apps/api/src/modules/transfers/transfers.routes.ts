import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assertCanAccessDepartment } from "../../lib/authorize.js";
import { reassignConversation } from "../conversations/conversations.service.js";

const createBody = z.object({
  conversationId: z.string().uuid(),
  toUserId: z.string().uuid(),
  note: z.string().max(1000).optional(),
});

const respondBody = z.object({ accept: z.boolean() });

const listQuery = z.object({
  side: z.enum(["sent", "received"]).default("received"),
  status: z
    .enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"])
    .optional(),
});

export const transfersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req) => {
    const q = listQuery.parse(req.query);
    const where =
      q.side === "sent"
        ? { fromUserId: req.auth.id }
        : { toUserId: req.auth.id };
    const items = await app.prisma.transfer.findMany({
      where: { ...where, ...(q.status ? { status: q.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        conversation: {
          include: { contact: { select: { displayName: true, phoneE164: true } } },
        },
        fromUser: { select: { id: true, fullName: true } },
        toUser: { select: { id: true, fullName: true } },
      },
    });
    return { items };
  });

  app.post("/", async (req, reply) => {
    const data = createBody.parse(req.body);
    const conv = await app.prisma.conversation.findUnique({
      where: { id: data.conversationId },
    });
    if (!conv) return reply.notFound();
    if (!assertCanAccessDepartment(req, reply, conv.departmentId)) return;
    if (conv.status !== "IN_PROGRESS" || conv.assignedAgentId !== req.auth.id) {
      return reply.forbidden(
        "Só é possível transferir uma conversa IN_PROGRESS atribuída a você.",
      );
    }
    const transfer = await app.prisma.transfer.create({
      data: {
        conversationId: data.conversationId,
        fromUserId: req.auth.id,
        toUserId: data.toUserId,
        note: data.note,
      },
    });
    return transfer;
  });

  app.post("/:id/respond", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { accept } = respondBody.parse(req.body);

    const transfer = await app.prisma.transfer.findUnique({
      where: { id },
      include: { conversation: true },
    });
    if (!transfer) return reply.notFound();
    if (transfer.toUserId !== req.auth.id) return reply.forbidden();
    if (transfer.status !== "PENDING") {
      return reply.conflict("Transferência já respondida.");
    }

    const status = accept ? "ACCEPTED" : "REJECTED";
    const now = new Date();

    return app.prisma.$transaction(async (tx) => {
      const updated = await tx.transfer.update({
        where: { id },
        data: { status, respondedAt: now },
      });
      if (accept) {
        await reassignConversation(tx, {
          conversationId: transfer.conversationId,
          newAgentId: req.auth.id,
          now,
        });
      }
      return updated;
    });
  });

  app.post("/:id/cancel", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const transfer = await app.prisma.transfer.findUnique({ where: { id } });
    if (!transfer) return reply.notFound();
    if (transfer.fromUserId !== req.auth.id) return reply.forbidden();
    if (transfer.status !== "PENDING") {
      return reply.conflict("Transferência já respondida.");
    }
    return app.prisma.transfer.update({
      where: { id },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
  });
};
