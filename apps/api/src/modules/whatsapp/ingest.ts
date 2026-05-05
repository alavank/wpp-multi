import { downloadMediaMessage, type proto } from "@baileys/baileys";
import type { MessageType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ensureOpenConversationForInbound } from "../conversations/conversations.service.js";
import {
  recordInboundMedia,
  recordInboundText,
} from "../messages/messages.service.js";
import { storeMedia } from "../messages/media.service.js";
import { jidToPhone } from "./session-manager.js";

type Detected =
  | { kind: "TEXT"; text: string }
  | {
      kind: "MEDIA";
      type: MessageType;
      bucket: string;
      mimeType: string;
      caption?: string;
      durationMs?: number;
      width?: number;
      height?: number;
    };

export async function handleInboundMessage(
  departmentId: string,
  msg: proto.IWebMessageInfo,
): Promise<void> {
  if (msg.key.fromMe) return;
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return;

  const isGroup = remoteJid.endsWith("@g.us");
  const sourceJid = isGroup ? msg.key.participant ?? remoteJid : remoteJid;
  const phoneE164 = jidToPhone(sourceJid);

  const detected = detect(msg.message);
  if (!detected) return;

  const sentAt = new Date(Number(msg.messageTimestamp ?? Date.now()) * 1000);
  const whatsappMessageId = msg.key.id ?? undefined;
  if (!whatsappMessageId) return;

  // Para mídia, faz download FORA da transação (operação lenta).
  let mediaBuffer: Buffer | null = null;
  if (detected.kind === "MEDIA") {
    try {
      mediaBuffer = (await downloadMediaMessage(msg, "buffer", {})) as Buffer;
    } catch (err) {
      console.error("[wa] falha ao baixar mídia", err);
      return;
    }
  }

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

    if (detected.kind === "TEXT") {
      await recordInboundText(tx, {
        conversationId: conversation.id,
        whatsappMessageId,
        body: detected.text,
        sentAt,
        groupParticipantPhone: isGroup ? phoneE164 : undefined,
      });
    } else if (mediaBuffer) {
      const asset = await storeMedia(tx, {
        buffer: mediaBuffer,
        mimeType: detected.mimeType,
        bucket: detected.bucket,
        durationMs: detected.durationMs,
        width: detected.width,
        height: detected.height,
      });
      await recordInboundMedia(tx, {
        conversationId: conversation.id,
        whatsappMessageId,
        type: detected.type,
        mediaId: asset.id,
        caption: detected.caption,
        sentAt,
        groupParticipantPhone: isGroup ? phoneE164 : undefined,
      });
    }
  });
}

function detect(message: proto.IMessage | null | undefined): Detected | null {
  if (!message) return null;

  if (message.conversation) return { kind: "TEXT", text: message.conversation };
  if (message.extendedTextMessage?.text)
    return { kind: "TEXT", text: message.extendedTextMessage.text };

  if (message.imageMessage) {
    return {
      kind: "MEDIA",
      type: "IMAGE",
      bucket: "image",
      mimeType: message.imageMessage.mimetype ?? "image/jpeg",
      caption: message.imageMessage.caption ?? undefined,
      width: message.imageMessage.width ?? undefined,
      height: message.imageMessage.height ?? undefined,
    };
  }
  if (message.videoMessage) {
    // PTV (vídeo circular instantâneo) nem sempre é exposto via tipagem do
    // Baileys; lemos via cast para não quebrar o build.
    const isInstant =
      (message.videoMessage as unknown as { ptv?: boolean }).ptv === true;
    return {
      kind: "MEDIA",
      type: isInstant ? "INSTANT_VIDEO" : "VIDEO",
      bucket: isInstant ? "instant_video" : "video",
      mimeType: message.videoMessage.mimetype ?? "video/mp4",
      caption: message.videoMessage.caption ?? undefined,
      durationMs:
        message.videoMessage.seconds != null
          ? message.videoMessage.seconds * 1000
          : undefined,
      width: message.videoMessage.width ?? undefined,
      height: message.videoMessage.height ?? undefined,
    };
  }
  if (message.audioMessage) {
    return {
      kind: "MEDIA",
      type: "AUDIO",
      bucket: "audio",
      mimeType: message.audioMessage.mimetype ?? "audio/ogg",
      durationMs:
        message.audioMessage.seconds != null
          ? message.audioMessage.seconds * 1000
          : undefined,
    };
  }
  if (message.documentMessage) {
    return {
      kind: "MEDIA",
      type: "DOCUMENT",
      bucket: "document",
      mimeType: message.documentMessage.mimetype ?? "application/octet-stream",
      caption: message.documentMessage.fileName ?? undefined,
    };
  }
  if (message.stickerMessage) {
    return {
      kind: "MEDIA",
      type: "STICKER",
      bucket: "sticker",
      mimeType: message.stickerMessage.mimetype ?? "image/webp",
    };
  }
  return null;
}
