import path from "node:path";
import fs from "node:fs/promises";
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
} from "@baileys/baileys";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../lib/env.js";
import { handleInboundMessage } from "./ingest.js";
import type { FastifyBaseLogger } from "fastify";

type SessionEntry = {
  sock: WASocket;
  lastQrCode?: string;
};

class WhatsappManager {
  private sessions = new Map<string, SessionEntry>();
  private starting = new Map<string, Promise<void>>();
  private log?: FastifyBaseLogger;

  attachLogger(log: FastifyBaseLogger) {
    this.log = log;
  }

  async start(departmentId: string): Promise<void> {
    if (this.sessions.has(departmentId)) return;
    const inFlight = this.starting.get(departmentId);
    if (inFlight) return inFlight;

    const promise = this.bootstrap(departmentId).finally(() => {
      this.starting.delete(departmentId);
    });
    this.starting.set(departmentId, promise);
    return promise;
  }

  private async bootstrap(departmentId: string): Promise<void> {
    const session = await prisma.whatsappSession.findUnique({ where: { departmentId } });
    if (!session) {
      throw new Error(`Sessão WhatsApp não cadastrada para departamento ${departmentId}.`);
    }
    const authDir = path.resolve(env.BAILEYS_AUTH_DIR, departmentId);
    await fs.mkdir(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["wpp-multi", "Chrome", "1.0.0"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const entry = this.sessions.get(departmentId);
      if (qr) {
        if (entry) entry.lastQrCode = qr;
        await prisma.whatsappSession.update({
          where: { departmentId },
          data: { status: "QR_PENDING", lastQrCode: qr },
        });
        this.log?.info({ departmentId }, "[wa] QR pendente");
      }
      if (connection === "open") {
        await prisma.whatsappSession.update({
          where: { departmentId },
          data: {
            status: "CONNECTED",
            connectedAt: new Date(),
            lastSeenAt: new Date(),
            lastQrCode: null,
          },
        });
        this.log?.info({ departmentId }, "[wa] conectado");
      }
      if (connection === "close") {
        const code = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
          ?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        await prisma.whatsappSession.update({
          where: { departmentId },
          data: { status: "DISCONNECTED", lastSeenAt: new Date() },
        });
        this.sessions.delete(departmentId);
        this.log?.warn({ departmentId, code, shouldReconnect }, "[wa] desconectado");
        if (shouldReconnect) {
          setTimeout(() => {
            this.start(departmentId).catch((err) =>
              this.log?.error({ err }, "[wa] falha ao reconectar"),
            );
          }, 3000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        try {
          await handleInboundMessage(departmentId, msg);
        } catch (err) {
          this.log?.error({ err }, "[wa] falha ingestão mensagem");
        }
      }
    });

    this.sessions.set(departmentId, { sock });
  }

  async stop(departmentId: string): Promise<void> {
    const entry = this.sessions.get(departmentId);
    if (!entry) return;
    entry.sock.end(undefined);
    this.sessions.delete(departmentId);
  }

  /**
   * Envia texto com prefixo `[Nome] disse: `. Retorna o id retornado pelo Baileys.
   */
  async sendText(
    departmentId: string,
    toPhoneE164: string,
    payload: { prefix: string; body: string },
  ): Promise<{ id?: string }> {
    const entry = this.sessions.get(departmentId);
    if (!entry) throw new Error(`Sessão Baileys não ativa para departamento ${departmentId}.`);
    const jid = toJid(toPhoneE164);
    const sent = await entry.sock.sendMessage(jid, {
      text: `${payload.prefix}${payload.body}`,
    });
    return { id: sent?.key?.id ?? undefined };
  }

  async sendMedia(
    departmentId: string,
    toPhoneE164: string,
    payload: {
      type: "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "INSTANT_VIDEO";
      buffer: Buffer;
      mimeType: string;
      caption?: string;
    },
  ): Promise<{ id?: string }> {
    const entry = this.sessions.get(departmentId);
    if (!entry) throw new Error(`Sessão Baileys não ativa para departamento ${departmentId}.`);
    const jid = toJid(toPhoneE164);

    let content: Parameters<WASocket["sendMessage"]>[1];
    switch (payload.type) {
      case "IMAGE":
        content = { image: payload.buffer, caption: payload.caption };
        break;
      case "VIDEO":
        content = { video: payload.buffer, caption: payload.caption };
        break;
      case "INSTANT_VIDEO":
        content = { video: payload.buffer, caption: payload.caption, ptv: true };
        break;
      case "AUDIO":
        content = { audio: payload.buffer, mimetype: payload.mimeType, ptt: true };
        break;
      case "DOCUMENT":
        content = {
          document: payload.buffer,
          mimetype: payload.mimeType,
          fileName: payload.caption ?? "arquivo",
        };
        break;
    }
    const sent = await entry.sock.sendMessage(jid, content);
    return { id: sent?.key?.id ?? undefined };
  }

  getQrCode(departmentId: string): string | undefined {
    return this.sessions.get(departmentId)?.lastQrCode;
  }
}

let _instance: WhatsappManager | null = null;

export function getWhatsappManager(): WhatsappManager {
  if (!_instance) _instance = new WhatsappManager();
  return _instance;
}

export function toJid(phoneE164: string): string {
  // Baileys usa "{number}@s.whatsapp.net" sem o "+".
  const digits = phoneE164.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

export function jidToPhone(jid: string): string {
  const digits = jid.split("@")[0]?.replace(/\D/g, "") ?? "";
  return `+${digits}`;
}
