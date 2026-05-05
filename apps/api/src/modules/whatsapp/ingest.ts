import type { proto } from "@baileys/baileys";
import { prisma } from "../../lib/prisma.js";
import { ensureOpenConversationForInbound } from "../conversations/conversations.service.js";
import { recordInboundText } from "../messages/messages.service.js";
import { jidToPhone } from "./session-manager.js";

export async function handleInboundMessage(
  departmentId: string,
  msg: proto.IWebMessageInfo,
): Promise<void> {
  if (msg.key.fromMe) return; // ignoramos eco da própria conta nesta etapa
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return;

  const isGroup = remoteJid.endsWith("@g.us");
  const sourceJid = isGroup ? msg.key.participant ?? remoteJid : remoteJid;
  const phoneE164 = jidToPhone(sourceJid);
  const text = extractText(msg.message);
  if (!text) return; // mídia trataremos em etapa posterior

  const sentAt = new Date(Number(msg.messageTimestamp ?? Date.now()) * 1000);
  const whatsappMessageId = msg.key.id ?? undefined;
  if (!whatsappMessageId) return;

  await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.upsert({
      where: { departmentId_phoneE164: { departmentId, phoneE164 } },
      update: { pushName: msg.pushName ?? undefined },
      create: {
        departmentId,
        phoneE164,
        pushName: msg.pushName ?? undefined,
      },
    });

    const conversation = await ensureOpenConversationForInbound(tx, {
      departmentId,
      contactId: contact.id,
      messageAt: sentAt,
    });

    await recordInboundText(tx, {
      conversationId: conversation.id,
      whatsappMessageId,
      body: text,
      sentAt,
      groupParticipantPhone: isGroup ? phoneE164 : undefined,
    });
  });
}

function extractText(message: proto.IMessage | null | undefined): string | undefined {
  if (!message) return undefined;
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    undefined
  );
}
