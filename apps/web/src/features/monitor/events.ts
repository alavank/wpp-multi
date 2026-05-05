/** Mapeia ações de audit_logs para texto humano + cor da timeline. */
export type EventTone = "info" | "success" | "warning" | "danger" | "neutral";

export type EventVisual = {
  label: string;
  tone: EventTone;
  icon: string;
};

export function describeAction(
  action: string,
  metadata: Record<string, unknown>,
  actorName: string | null,
): EventVisual {
  const who = actorName ?? "Sistema";
  switch (action) {
    case "user.login":
      return { label: `${who} entrou no sistema`, tone: "info", icon: "🔓" };
    case "conversation.assume":
      return { label: `${who} assumiu uma conversa`, tone: "success", icon: "📥" };
    case "conversation.finish":
      return { label: `${who} encerrou uma conversa`, tone: "neutral", icon: "✅" };
    case "message.send_text":
      return { label: `${who} enviou mensagem`, tone: "info", icon: "💬" };
    case "message.send_media":
      return { label: `${who} enviou mídia`, tone: "info", icon: "🖼" };
    case "transfer.create":
      return { label: `${who} criou uma transferência`, tone: "warning", icon: "🔁" };
    case "transfer.accept":
      return { label: `${who} aceitou uma transferência`, tone: "success", icon: "✓" };
    case "transfer.reject":
      return { label: `${who} rejeitou uma transferência`, tone: "danger", icon: "✗" };
    case "scheduled_return.create":
      return { label: `${who} agendou um retorno`, tone: "info", icon: "📅" };
    case "permission.grant":
      return {
        label: `${who} concedeu ${(metadata.permission as string) ?? "permissão"}`,
        tone: "warning",
        icon: "🔐",
      };
    case "permission.revoke":
      return {
        label: `${who} revogou ${(metadata.permission as string) ?? "permissão"}`,
        tone: "danger",
        icon: "🔒",
      };
    default:
      return { label: `${who} • ${action}`, tone: "neutral", icon: "•" };
  }
}

export function toneClasses(tone: EventTone): string {
  switch (tone) {
    case "info":
      return "from-cyan-500/30 to-blue-500/20 border-cyan-400/40 shadow-cyan-500/30";
    case "success":
      return "from-emerald-500/30 to-teal-500/20 border-emerald-400/40 shadow-emerald-500/30";
    case "warning":
      return "from-amber-500/30 to-orange-500/20 border-amber-400/40 shadow-amber-500/30";
    case "danger":
      return "from-rose-500/30 to-red-500/20 border-rose-400/40 shadow-rose-500/30";
    case "neutral":
    default:
      return "from-slate-500/25 to-slate-600/20 border-slate-400/40 shadow-slate-500/30";
  }
}
