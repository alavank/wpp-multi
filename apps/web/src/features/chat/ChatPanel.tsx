import { useEffect, useRef, useState } from "react";
import { useSelectionStore } from "../../stores/selectionStore";
import { useAuthStore } from "../../stores/authStore";
import { useMessages, type ApiMessage } from "../../hooks/useMessages";
import { apiFetch } from "../../lib/apiClient";
import { ScheduleReturnButton } from "../schedule-return/ScheduleReturnButton";
import { useConversations } from "../../hooks/useConversations";
import { MediaBubble } from "./MediaBubble";
import { Avatar } from "../../components/Avatar";
import { DepartmentTag } from "../../components/DepartmentTag";
import {
  IconMic,
  IconMore,
  IconPaperclip,
  IconPlus,
  IconSearch,
  IconSend,
  IconSmile,
} from "../../components/Icon";

type Props = { className?: string };

export function ChatPanel({ className }: Props) {
  const departmentId = useSelectionStore((s) => s.departmentId);
  const conversationId = useSelectionStore((s) => s.conversationId);
  const userId = useAuthStore((s) => s.user?.id);

  const { items: allConvs, refetch: refetchConvs } = useConversations({ departmentId });
  const conversation = allConvs.find((c) => c.id === conversationId) ?? null;

  const { items: messages, sendText, sendMedia } = useMessages(conversationId);

  if (!conversation) {
    return (
      <section className={`flex flex-col bg-base-100 ${className ?? ""}`}>
        <div className="flex-1 grid place-items-center px-6 text-center">
          <div className="space-y-3 max-w-xs">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-base-200 grid place-items-center text-primary">
              <IconSearch size={22} />
            </div>
            <p className="text-sm text-base-content/60">
              Selecione uma conversa para começar a interagir.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const contactName =
    conversation.contact.displayName ??
    conversation.contact.pushName ??
    conversation.contact.phoneE164;
  const isMine = conversation.assignedAgentId === userId;
  const canSend = conversation.status === "IN_PROGRESS" && isMine;

  async function handleAssume() {
    await apiFetch(`/conversations/${conversation!.id}/assume`, { method: "POST" });
    void refetchConvs();
  }
  async function handleFinish() {
    await apiFetch(`/conversations/${conversation!.id}/finish`, { method: "POST" });
    void refetchConvs();
  }

  return (
    <section className={`flex flex-col bg-base-100 ${className ?? ""}`}>
      <header className="px-5 py-4 flex items-center gap-3 border-b divider-hair">
        <Avatar
          name={contactName}
          src={conversation.contact.profilePicUrl ?? undefined}
          sizeClass="w-11"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{contactName}</span>
            <DepartmentTag departmentId={conversation.departmentId} />
          </div>
          <div className="text-xs text-base-content/55 flex items-center gap-2 mt-0.5">
            <StatusBadge status={conversation.status} />
            <span className="opacity-50">·</span>
            <span>{conversation.contact.phoneE164}</span>
          </div>
        </div>

        <ScheduleReturnButton
          contact={{ name: contactName, phone: conversation.contact.phoneE164 }}
          conversationId={conversation.id}
        />

        {conversation.status === "WAITING" && (
          <button type="button" className="btn-flat-primary" onClick={handleAssume}>
            Assumir
          </button>
        )}
        {conversation.status === "IN_PROGRESS" && isMine && (
          <button type="button" className="btn-flat-neutral" onClick={handleFinish}>
            Encerrar
          </button>
        )}

        <button type="button" className="btn-icon" aria-label="Buscar">
          <IconSearch />
        </button>
        <button type="button" className="btn-icon" aria-label="Mais ações">
          <IconMore />
        </button>
      </header>

      <MessageList items={messages} currentUserId={userId} />

      <Composer disabled={!canSend} onSendText={sendText} onSendMedia={sendMedia} />
    </section>
  );
}

function MessageList({
  items,
  currentUserId,
}: {
  items: ApiMessage[];
  currentUserId?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="flex-1 grid place-items-center text-sm text-base-content/55">
        Nenhuma mensagem ainda.
      </div>
    );
  }

  let lastDay = "";

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-soft px-5 py-4 space-y-1.5"
    >
      {items.map((m) => {
        const day = new Date(m.sentAt).toDateString();
        const showDayDivider = day !== lastDay;
        lastDay = day;

        const node =
          m.type === "SYSTEM" ? (
            <div key={m.id} className="my-3 flex justify-center">
              <span className="text-[11px] uppercase tracking-wider text-base-content/45 bg-base-200 rounded-full px-3 py-1">
                {m.body}
              </span>
            </div>
          ) : (
            <Bubble key={m.id} m={m} mine={m.direction === "OUTBOUND" && m.sender?.id === currentUserId} />
          );

        return (
          <div key={`g-${m.id}`} className="animate-fade-in-up">
            {showDayDivider && <DayDivider date={m.sentAt} />}
            {node}
          </div>
        );
      })}
    </div>
  );
}

function DayDivider({ date }: { date: string }) {
  const d = new Date(date);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const label = same(d, today)
    ? "Hoje"
    : same(d, yest)
      ? "Ontem"
      : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex justify-center my-3">
      <span className="text-[11px] text-base-content/50">
        {label} <span className="opacity-60">{time}</span>
      </span>
    </div>
  );
}

function Bubble({ m, mine }: { m: ApiMessage; mine: boolean }) {
  const outbound = m.direction === "OUTBOUND";
  const time = new Date(m.sentAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className={`flex items-end gap-2 ${outbound ? "justify-end" : "justify-start"}`}>
      {!outbound && (
        <Avatar
          name={m.sender?.fullName ?? "?"}
          src={m.sender?.photoUrl ?? undefined}
          sizeClass="w-7"
        />
      )}
      <div className="flex flex-col items-stretch gap-1 max-w-[78%]">
        <div className={`bubble ${mine || outbound ? "bubble-out" : "bubble-in"}`}>
          {m.mediaId ? <MediaBubble message={m} /> : m.body}
        </div>
        <span
          className={`text-[10px] text-base-content/45 ${
            outbound ? "self-end" : "self-start"
          }`}
        >
          {time}
        </span>
      </div>
      {outbound && (
        <Avatar
          name={m.sender?.fullName ?? "?"}
          src={m.sender?.photoUrl ?? undefined}
          sizeClass="w-7"
        />
      )}
    </div>
  );
}

type SendMediaFn = (
  file: File,
  type: "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "INSTANT_VIDEO",
  caption?: string,
) => Promise<unknown>;

function Composer({
  disabled,
  onSendText,
  onSendMedia,
}: {
  disabled: boolean;
  onSendText: (body: string) => Promise<unknown>;
  onSendMedia: SendMediaFn;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    setSending(true);
    try {
      await onSendText(value.trim());
      setValue("");
    } finally {
      setSending(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setSending(true);
    try {
      const type = inferType(file);
      await onSendMedia(file, type, value.trim() || undefined);
      setValue("");
    } finally {
      setSending(false);
    }
  }

  const idle = !value.trim();

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-t divider-hair">
      <div className="flex items-center gap-2 bg-base-200 rounded-full pl-5 pr-2 py-1.5">
        <input
          type="text"
          className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-base-content/40 py-1.5"
          placeholder={
            disabled ? "Assuma a conversa para enviar mensagens" : "Digite uma mensagem…"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled || sending}
        />
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={handleFile}
          disabled={disabled || sending}
        />
        <button
          type="button"
          className="btn-icon"
          aria-label="Áudio"
          disabled={disabled || sending}
        >
          <IconMic size={16} />
        </button>
        <button
          type="button"
          className="btn-icon"
          aria-label="Emoji"
          disabled={disabled || sending}
        >
          <IconSmile size={16} />
        </button>
        <button
          type="button"
          className="btn-icon"
          aria-label="Anexar"
          onClick={() => fileInput.current?.click()}
          disabled={disabled || sending}
        >
          <IconPaperclip size={16} />
        </button>
        <button
          type="button"
          className="btn-icon"
          aria-label="Mais"
          disabled={disabled || sending}
        >
          <IconPlus size={16} />
        </button>
        <button
          type="submit"
          className="grid place-items-center w-9 h-9 rounded-full bg-primary text-primary-content shadow-glow disabled:opacity-50 disabled:shadow-none active:scale-95 transition"
          disabled={disabled || sending || idle}
          aria-label="Enviar"
        >
          <IconSend size={16} />
        </button>
      </div>
    </form>
  );
}

function inferType(
  file: File,
): "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "INSTANT_VIDEO" {
  const m = file.type;
  if (m.startsWith("image/")) return "IMAGE";
  if (m.startsWith("audio/")) return "AUDIO";
  if (m.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { dot: string; text: string; label: string }> = {
    WAITING: { dot: "bg-amber-400", text: "text-amber-600", label: "Aguardando" },
    IN_PROGRESS: { dot: "bg-emerald-400", text: "text-emerald-600", label: "Em atendimento" },
    FINISHED: { dot: "bg-base-content/30", text: "text-base-content/55", label: "Finalizada" },
  };
  const meta = map[status] ?? map.FINISHED!;
  return (
    <span className={`inline-flex items-center gap-1.5 ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
