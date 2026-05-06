import fp from "fastify-plugin";
import { getSupabaseAdmin } from "../lib/supabase.js";

const BUCKETS = [
  { name: "avatars", public: true, fileSizeLimit: 300 * 1024 },
];

/**
 * Garante que os buckets necessários existem no Supabase Storage.
 * Idempotente: roda no boot, ignora "already exists".
 */
export const storagePlugin = fp(async (app) => {
  try {
    const supa = getSupabaseAdmin();
    for (const b of BUCKETS) {
      const { data: existing } = await supa.storage.getBucket(b.name);
      if (existing) {
        // Garante que está público se for o caso (idempotente).
        if (b.public && !existing.public) {
          await supa.storage.updateBucket(b.name, { public: true });
        }
        continue;
      }
      const { error } = await supa.storage.createBucket(b.name, {
        public: b.public,
        fileSizeLimit: b.fileSizeLimit,
      });
      if (error && !/already exists/i.test(error.message)) {
        app.log.warn(`[storage] falha ao criar bucket ${b.name}: ${error.message}`);
      } else {
        app.log.info(`[storage] bucket ${b.name} pronto`);
      }
    }
  } catch (err) {
    // Ausência de SUPABASE_SERVICE_ROLE_KEY não derruba a API.
    app.log.warn(`[storage] init pulado: ${(err as Error).message}`);
  }
});
