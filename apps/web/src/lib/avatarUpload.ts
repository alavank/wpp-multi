import { supabase } from "./supabaseClient";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const TARGET_SIZE = 300;

/**
 * Redimensiona uma imagem para caber em 300x300 (cover, mantendo proporção),
 * comprime em JPEG ~0.85 e retorna um Blob pronto pra upload.
 */
export async function resizeAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo precisa ser uma imagem.");
  }

  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  // Cover: corta para o lado menor caber em 300x300
  const ratio = Math.max(TARGET_SIZE / img.width, TARGET_SIZE / img.height);
  const drawW = img.width * ratio;
  const drawH = img.height * ratio;
  const dx = (TARGET_SIZE - drawW) / 2;
  const dy = (TARGET_SIZE - drawH) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
  ctx.drawImage(img, dx, dy, drawW, drawH);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Falha ao gerar imagem."));
        resolve(blob);
      },
      "image/jpeg",
      0.85,
    );
  });
}

/** Faz upload do avatar redimensionado para o backend e devolve a nova URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const blob = await resizeAvatar(file);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${baseUrl}/users/${userId}/avatar`, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: blob,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload falhou: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { id: string; photoUrl: string };
  return json.photoUrl;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagem inválida."));
    img.src = src;
  });
}
