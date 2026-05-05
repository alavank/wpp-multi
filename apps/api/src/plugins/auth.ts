import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { Role } from "@prisma/client";
import { env } from "../lib/env.js";

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentIds: string[];
};

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      req: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    auth: AuthenticatedUser;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email?: string; role?: string };
    user: { sub: string; email?: string; role?: string };
  }
}

export const authPlugin = fp(async (app) => {
  if (!env.SUPABASE_JWT_SECRET) {
    app.log.warn(
      "[auth] SUPABASE_JWT_SECRET ausente — todas as rotas autenticadas vão falhar.",
    );
  }

  await app.register(jwt, {
    secret: env.SUPABASE_JWT_SECRET ?? "missing-secret",
    verify: { algorithms: ["HS256"] },
  });

  app.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.unauthorized("Token inválido ou ausente.");
    }

    const sub = req.user.sub;
    const dbUser = await app.prisma.user.findUnique({
      where: { id: sub },
      include: { memberships: { select: { departmentId: true } } },
    });

    if (!dbUser || !dbUser.isActive) {
      return reply.unauthorized("Usuário não encontrado ou inativo.");
    }

    req.auth = {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role,
      departmentIds: dbUser.memberships.map((m) => m.departmentId),
    };
  });
});
