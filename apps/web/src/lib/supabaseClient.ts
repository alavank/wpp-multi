import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Não derruba o app — em dev sem .env ainda queremos a UI compilando.
  // Auth/Realtime simplesmente não funcionarão até o .env ser preenchido.
  console.warn("[supabase] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes.");
}

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "anon", {
  auth: { persistSession: true, autoRefreshToken: true },
});
