import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";

/** Garante que o atendente pertence ao departamento. Super admin passa direto. */
export function assertCanAccessDepartment(
  req: FastifyRequest,
  reply: FastifyReply,
  departmentId: string,
): boolean {
  if (req.auth.role === "SUPER_ADMIN") return true;
  if (req.auth.departmentIds.includes(departmentId)) return true;
  reply.forbidden("Sem acesso a este departamento.");
  return false;
}

export function assertRole(
  req: FastifyRequest,
  reply: FastifyReply,
  ...roles: Role[]
): boolean {
  if (roles.includes(req.auth.role)) return true;
  reply.forbidden("Permissão insuficiente.");
  return false;
}
