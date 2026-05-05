import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../lib/prisma.js";
import { getWhatsappManager } from "../modules/whatsapp/session-manager.js";
import { recordOutboundText } from "../modules/messages/messages.service.js";

/**
 * Loop simples: a cada 60s, busca ScheduledReturn PENDING cujo scheduledFor já
 * passou, envia mensagem de lembrete pelo Baileys e marca NOTIFIED.
 *
 * Para múltiplas instâncias do API, mover para BullMQ/Redis. Para 1 instância
 * on-premise (caso típico do projeto), polling em memória basta.
 */
export function startScheduledReturnsWorker(log: FastifyBaseLogger) {
  const interval = 60_000;
  const tick = async () => {
    try {
      await runOnce(log);
    } catch (err) {
      log.error({ err }, "[scheduled-returns-worker] tick falhou");
    }
  };
  void tick();
  const handle = setInterval(tick, interval);
  return () => clearInterval(handle);
}

export async function runOnce(log: FastifyBaseLogger) {
  const now = new Date();
  const due = await prisma.scheduledReturn.findMany({
    where: { status: "PENDING", scheduledFor: { lte: now } },
    take: 25,
    include: {
      conversation: { select: { id: true, departmentId: true } },
      contact: true,
      agent: { select: { id: true, fullName: true } },
    },
  });
  if (due.length === 0) return;

  const mgr = getWhatsappManager();

  for (const sr of due) {
    const text = `Olá! Lembrete do retorno agendado para hoje. Assunto: ${sr.subject}`;
    try {
      const result = await mgr.sendText(sr.conversation.departmentId, sr.contact.phoneE164, {
        prefix: `${sr.agent.fullName} disse: `,
        body: text,
      });
      await recordOutboundText(prisma, {
        conversationId: sr.conversationId,
        senderUserId: sr.agentId,
        senderFullName: sr.agent.fullName,
        body: text,
        whatsappMessageId: result?.id,
      });
      await prisma.scheduledReturn.update({
        where: { id: sr.id },
        data: { status: "NOTIFIED", notifiedAt: new Date() },
      });
      log.info({ scheduledReturnId: sr.id }, "[scheduled-returns-worker] notificado");
    } catch (err) {
      log.error({ err, scheduledReturnId: sr.id }, "[scheduled-returns-worker] falha ao notificar");
    }
  }
}
