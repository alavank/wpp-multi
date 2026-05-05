import type { FastifyPluginAsync } from "fastify";
import fs from "node:fs";
import { z } from "zod";
import { assertCanAccessDepartment } from "../../lib/authorize.js";
import { storeMedia } from "./media.service.js";

export const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);

  // Upload de arquivo binário cru via PUT /media?bucket=image
  // Mais simples e mais leve do que multipart para mídia única.
  app.put("/", async (req, reply) => {
    const q = z
      .object({
        bucket: z.enum(["image", "video", "audio", "document", "sticker", "instant_video"]),
        mime: z.string().min(1),
      })
      .parse(req.query);

    const chunks: Buffer[] = [];
    for await (const chunk of req.raw) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.byteLength === 0) return reply.badRequest("Body vazio.");

    const asset = await storeMedia(app.prisma, {
      buffer,
      mimeType: q.mime,
      bucket: q.bucket,
    });
    return { id: asset.id, sizeBytes: asset.sizeBytes };
  });

  // Stream de download por id (controlado pelas conversas que o usuário acessa).
  app.get("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const media = await app.prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        messages: {
          take: 1,
          select: { conversation: { select: { departmentId: true } } },
        },
      },
    });
    if (!media) return reply.notFound();

    const departmentId = media.messages[0]?.conversation?.departmentId;
    if (departmentId && !assertCanAccessDepartment(req, reply, departmentId)) return;

    if (!fs.existsSync(media.localPath)) return reply.notFound("Arquivo ausente.");

    reply.type(media.mimeType);
    return fs.createReadStream(media.localPath);
  });
};
