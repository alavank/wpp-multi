import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export function buildAgentPrefix(fullName: string): string {
  return `${fullName} disse: `;
}

/**
 * Persiste uma mensagem outbound enviada pelo atendente. Aplica e cacheia o
 * prefixo "[Nome] disse: " para fidelidade do histórico.
 */
export async function recordOutboundText(
  tx: Tx,
  params: {
    conversationId: string;
    senderUserId: string;
    senderFullName: string;
    body: string;
    whatsappMessageId?: string;
    sentAt?: Date;
  },
) {
  const sentAt = params.sentAt ?? new Date();
  const prefix = buildAgentPrefix(params.senderFullName);
  return tx.message.create({
    data: {
      conversationId: params.conversationId,
      direction: "OUTBOUND",
      type: "TEXT",
      body: `${prefix}${params.body}`,
      agentDisplayPrefix: prefix,
      senderUserId: params.senderUserId,
      whatsappMessageId: params.whatsappMessageId,
      sentAt,
    },
  });
}

/** Persiste mensagem inbound vinda do WhatsApp. */
export async function recordInboundText(
  tx: Tx,
  params: {
    conversationId: string;
    whatsappMessageId: string;
    body: string;
    sentAt: Date;
    groupParticipantPhone?: string;
  },
) {
  return tx.message.create({
    data: {
      conversationId: params.conversationId,
      direction: "INBOUND",
      type: "TEXT",
      body: params.body,
      whatsappMessageId: params.whatsappMessageId,
      groupParticipantPhone: params.groupParticipantPhone,
      sentAt: params.sentAt,
    },
  });
}
