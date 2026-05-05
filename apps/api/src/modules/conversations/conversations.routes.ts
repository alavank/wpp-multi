import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  assumeConversation,
  finishConversation,
} from "./conversations.service.js";
import { assertCanAccessDepartment } from "../../lib/authorize.js";

const listQuery = z.object({
  departmentId: z.string().uuid(),
  status: z.enum(["WAITING", "IN_PROGRESS", "FINISHED"]).optional(),
  assignedToMe: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

export const conversationsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (req, reply) => {
    const q = listQuery.parse(req.query);
    if (!assertCanAccessDepartment(req, reply, q.departmentId)) return;

    const where = {
      departmentId: q.departmentId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.assignedToMe ? { assignedAgentId: req.auth.id } : {}),
    };

    const orderBy: import("@prisma/client").Prisma.ConversationOrderByWithRelationInput =
      q.status === "WAITING"
        ? { waitingSince: "asc" }
        : { lastMessageAt: "desc" };

    const items = await app.prisma.conversation.findMany({
      where,
      orderBy,
      take: q.limit,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: {
        contact: {
          select: { id: true, displayName: true, pushName: true, phoneE164: true, profilePicUrl: true },
        },
        assignedAgent: { select: { id: true, fullName: true, photoUrl: true } },
      },
    });

    return { items };
  });

  app.get("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const conv = await app.prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: true,
        assignedAgent: { select: { id: true, fullName: true, photoUrl: true } },
      },
    });
    if (!conv) return reply.notFound();
    if (!assertCanAccessDepartment(req, reply, conv.departmentId)) return;
    return conv;
  });

  app.post("/:id/assume", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const conv = await app.prisma.conversation.findUnique({ where: { id } });
    if (!conv) return reply.notFound();
    if (!assertCanAccessDepartment(req, reply, conv.departmentId)) return;

    try {
      const updated = await app.prisma.$transaction((tx) =>
        assumeConversation(tx, {
          conversationId: id,
          agentId: req.auth.id,
          agentFullName: req.auth.fullName,
        }),
      );
      await req.audit.emit({
        action: "conversation.assume",
        entityType: "conversation",
        entityId: id,
        departmentId: conv.departmentId,
      });
      return updated;
    } catch (err) {
      return reply.conflict((err as Error).message);
    }
  });

  app.post("/:id/finish", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const conv = await app.prisma.conversation.findUnique({ where: { id } });
    if (!conv) return reply.notFound();
    if (!assertCanAccessDepartment(req, reply, conv.departmentId)) return;

    try {
      const updated = await app.prisma.$transaction((tx) =>
        finishConversation(tx, { conversationId: id, userId: req.auth.id }),
      );
      await req.audit.emit({
        action: "conversation.finish",
        entityType: "conversation",
        entityId: id,
        departmentId: conv.departmentId,
      });
      return updated;
    } catch (err) {
      return reply.conflict((err as Error).message);
    }
  });
};
