import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../../lib/env.js";

type Tx = Prisma.TransactionClient | PrismaClient;

export type StoreMediaInput = {
  buffer: Buffer;
  mimeType: string;
  durationMs?: number;
  width?: number;
  height?: number;
  /** Subdiretório do tipo (image/video/audio/document/sticker/instant_video). */
  bucket: string;
};

export async function storeMedia(tx: Tx, input: StoreMediaInput) {
  const id = crypto.randomUUID();
  const ext = guessExtension(input.mimeType);
  const dir = path.resolve(env.MEDIA_STORE_DIR, input.bucket);
  await fs.mkdir(dir, { recursive: true });
  const localPath = path.join(dir, `${id}${ext}`);
  await fs.writeFile(localPath, input.buffer);

  return tx.mediaAsset.create({
    data: {
      id,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
      localPath,
      durationMs: input.durationMs,
      width: input.width,
      height: input.height,
    },
  });
}

export function guessExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "image/webp+sticker": ".webp",
  };
  return map[mimeType] ?? "";
}
