import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

let _admin: SupabaseClient | null = null;

/**
 * Cliente Supabase com service_role — ignora RLS. Usar apenas em jobs internos
 * (sincronização de usuários, criação de Departamento, etc.). Nunca expor.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "[supabase-admin] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.",
      );
    }
    _admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}
