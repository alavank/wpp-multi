import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { prismaPlugin } from "./plugins/prisma.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { colorize: true } },
    },
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: process.env.API_CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  });
  await app.register(prismaPlugin);

  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  // Módulos (rotas) — registrados em etapas posteriores:
  // await app.register(authRoutes, { prefix: "/auth" });
  // await app.register(departmentsRoutes, { prefix: "/departments" });
  // await app.register(usersRoutes, { prefix: "/users" });
  // await app.register(contactsRoutes, { prefix: "/contacts" });
  // await app.register(conversationsRoutes, { prefix: "/conversations" });
  // await app.register(messagesRoutes, { prefix: "/messages" });
  // await app.register(transfersRoutes, { prefix: "/transfers" });
  // await app.register(scheduledReturnsRoutes, { prefix: "/scheduled-returns" });
  // await app.register(groupsRoutes, { prefix: "/groups" });
  // await app.register(whatsappRoutes, { prefix: "/whatsapp" });

  return app;
}
