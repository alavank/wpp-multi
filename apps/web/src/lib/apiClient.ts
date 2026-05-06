import { supabase } from "./supabaseClient";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

async function getToken(forceRefresh = false): Promise<string | null> {
  if (forceRefresh) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authHeaders(forceRefresh = false): Promise<Headers> {
  const token = await getToken(forceRefresh);
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

function buildHeaders(base: Headers, init: RequestInit) {
  const isBinary =
    init.body instanceof Blob ||
    init.body instanceof ArrayBuffer ||
    init.body instanceof FormData;
  if (!isBinary && !base.has("Content-Type")) {
    base.set("Content-Type", "application/json");
  }
  if (init.headers) {
    new Headers(init.headers).forEach((v, k) => {
      if (k.toLowerCase() === "authorization") return;
      base.set(k, v);
    });
  }
  return base;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let headers = buildHeaders(await authHeaders(), init);
  let res = await fetch(`${baseUrl}${path}`, { ...init, headers });

  // Token pode estar expirado/ausente — tenta refresh uma vez antes de desistir.
  if (res.status === 401) {
    headers = buildHeaders(await authHeaders(true), init);
    res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  const ctype = res.headers.get("Content-Type") ?? "";
  if (ctype.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

/** URL pública autenticada para uma mídia. Inclui token via header (em <img> use mediaSrc). */
export function mediaUrl(mediaId: string): string {
  return `${baseUrl}/media/${mediaId}`;
}

/** Carrega uma mídia como object URL (com Authorization). Usar em <img>/<video>/<audio>. */
export async function loadMediaObjectUrl(mediaId: string): Promise<string> {
  const headers = await authHeaders();
  const res = await fetch(`${baseUrl}/media/${mediaId}`, { headers });
  if (!res.ok) throw new Error(`Falha ao carregar mídia ${mediaId}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
