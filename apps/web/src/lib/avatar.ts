/** Cor estável a partir do nome — para avatares placeholder coloridos. */
export function avatarColor(name: string): string {
  const palette = [
    "bg-rose-500 text-rose-50",
    "bg-orange-500 text-orange-50",
    "bg-amber-500 text-amber-50",
    "bg-lime-500 text-lime-50",
    "bg-emerald-500 text-emerald-50",
    "bg-teal-500 text-teal-50",
    "bg-cyan-500 text-cyan-50",
    "bg-sky-500 text-sky-50",
    "bg-indigo-500 text-indigo-50",
    "bg-violet-500 text-violet-50",
    "bg-fuchsia-500 text-fuchsia-50",
    "bg-pink-500 text-pink-50",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % palette.length;
  return palette[idx]!;
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
