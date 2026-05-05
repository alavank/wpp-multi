import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Cria/reabre conversa para um inbound. Se a conversa mais recente do contato
 * está FINISHED, é reaberta para o fim da fila (novo waitingSince=now).
 * Se já há conversa WAITING ou IN_PROGRESS, retorna ela.
 */
export async function ensureOpenConversationForInbound(
  tx: Tx,
  params: { departmentId: string; contactId: string; messageAt: Date },
) {
  const { departmentId, contactId, messageAt } = params;

  const latest = await tx.conversation.findFirst({
    where: { departmentId, contactId },
    orderBy: { createdAt: "desc" },
  });

  if (latest && latest.status !== "FINISHED") {
    return tx.conversation.update({
      where: { id: latest.id },
      data: {
        lastMessageAt: messageAt,
        unreadCount: { increment: 1 },
      },
    });
  }

  // Sem conversa aberta OU última está FINISHED → reabre como WAITING no fim da fila.
  return tx.conversation.create({
    data: {
      departmentId,
      contactId,
      status: "WAITING",
      waitingSince: messageAt,
      lastMessageAt: messageAt,
      unreadCount: 1,
    },
  });
}

/**
 * Atendente assume a conversa: WAITING → IN_PROGRESS.
 * Cria também a mensagem automática "[Nome] vai iniciar seu atendimento...".
 */
export async function assumeConversation(
  tx: Tx,
  params: { conversationId: string; agentId: string; agentFullName: string; now?: Date },
) {
  const { conversationId, agentId, agentFullName, now = new Date() } = params;

  const conversation = await tx.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) throw new Error("Conversa não encontrada.");
  if (conversation.status !== "WAITING") {
    throw new Error("Conversa só pode ser assumida no estado WAITING.");
  }

  const updated = await tx.conversation.update({
    where: { id: conversationId },
    data: {
      status: "IN_PROGRESS",
      assignedAgentId: agentId,
      assignedAt: now,
      waitingSince: null,
      unreadCount: 0,
    },
  });

  await tx.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      type: "SYSTEM",
      body: `${agentFullName} vai iniciar seu atendimento...`,
      senderUserId: agentId,
      sentAt: now,
    },
  });

  return updated;
}

/** Encerra explicitamente. IN_PROGRESS → FINISHED com finishedAt + finishedById. */
export async function finishConversation(
  tx: Tx,
  params: { conversationId: string; userId: string; now?: Date },
) {
  const { conversationId, userId, now = new Date() } = params;

  const conversation = await tx.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) throw new Error("Conversa não encontrada.");
  if (conversation.status !== "IN_PROGRESS") {
    throw new Error("Conversa só pode ser encerrada no estado IN_PROGRESS.");
  }

  return tx.conversation.update({
    where: { id: conversationId },
    data: {
      status: "FINISHED",
      finishedAt: now,
      finishedById: userId,
    },
  });
}

/** Reatribui a conversa para um novo atendente (já aceito). Mantém IN_PROGRESS. */
export async function reassignConversation(
  tx: Tx,
  params: { conversationId: string; newAgentId: string; now?: Date },
) {
  const { conversationId, newAgentId, now = new Date() } = params;
  return tx.conversation.update({
    where: { id: conversationId },
    data: {
      assignedAgentId: newAgentId,
      assignedAt: now,
      status: "IN_PROGRESS",
    },
  });
}
