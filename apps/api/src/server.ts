import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./lib/env.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { authPlugin } from "./plugins/auth.js";
import { auditPlugin } from "./plugins/audit.js";
import { conversationsRoutes } from "./modules/conversations/conversations.routes.js";
import { messagesRoutes } from "./modules/messages/messages.routes.js";
import { mediaRoutes } from "./modules/messages/media.routes.js";
import { transfersRoutes } from "./modules/transfers/transfers.routes.js";
import { scheduledReturnsRoutes } from "./modules/scheduled-returns/scheduled-returns.routes.js";
import { whatsappRoutes } from "./modules/whatsapp/whatsapp.routes.js";
import { departmentsRoutes } from "./modules/departments/departments.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { auditRoutes } from "./modules/audit/audit.routes.js";
import { permissionsRoutes } from "./modules/permissions/permissions.routes.js";

export async function buildServer() {
  const app = Fastify({
    bodyLimit: 50 * 1024 * 1024, // 50 MB para uploads de mídia
    trustProxy: true, // honra X-Forwarded-For p/ auditoria
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { colorize: true } },
    },
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: env.API_CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  });
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(auditPlugin);

  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  await app.register(conversationsRoutes, { prefix: "/conversations" });
  await app.register(messagesRoutes, { prefix: "/messages" });
  await app.register(mediaRoutes, { prefix: "/media" });
  await app.register(transfersRoutes, { prefix: "/transfers" });
  await app.register(scheduledReturnsRoutes, { prefix: "/scheduled-returns" });
  await app.register(whatsappRoutes, { prefix: "/whatsapp" });
  await app.register(departmentsRoutes, { prefix: "/departments" });
  await app.register(usersRoutes, { prefix: "/users" });
  await app.register(auditRoutes, { prefix: "/audit-logs" });
  await app.register(permissionsRoutes, { prefix: "/permissions" });

  return app;
}
