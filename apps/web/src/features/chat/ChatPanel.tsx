import { useRef, useState } from "react";
import { useSelectionStore } from "../../stores/selectionStore";
import { useAuthStore } from "../../stores/authStore";
import { useMessages, type ApiMessage } from "../../hooks/useMessages";
import { apiFetch } from "../../lib/apiClient";
import { ScheduleReturnButton } from "../schedule-return/ScheduleReturnButton";
import { useConversations } from "../../hooks/useConversations";
import { MediaBubble } from "./MediaBubble";
import { Avatar } from "../../components/Avatar";
import { DepartmentTag } from "../../components/DepartmentTag";

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
        <div className="flex-1 flex items-center justify-center text-sm opacity-60">
          Nenhuma conversa selecionada.
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
      <header className="border-b border-base-300 px-4 py-3 flex items-center gap-3">
        <Avatar name={contactName} src={conversation.contact.profilePicUrl ?? undefined} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{contactName}</span>
            <DepartmentTag departmentId={conversation.departmentId} />
          </div>
          <div className="text-xs opacity-60 flex items-center gap-2">
            <StatusBadge status={conversation.status} />
            <span>·</span>
            <span>{conversation.contact.phoneE164}</span>
          </div>
        </div>

        <ScheduleReturnButton
          contact={{ name: contactName, phone: conversation.contact.phoneE164 }}
          conversationId={conversation.id}
        />

        {conversation.status === "WAITING" && (
          <button type="button" className="btn btn-sm btn-primary" onClick={handleAssume}>
            Assumir
          </button>
        )}
        {conversation.status === "IN_PROGRESS" && isMine && (
          <button type="button" className="btn btn-sm" onClick={handleFinish}>
            Encerrar
          </button>
        )}
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
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm opacity-60">
        Nenhuma mensagem ainda.
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {items.map((m) => {
        if (m.type === "SYSTEM") {
          return (
            <div key={m.id} className="text-center text-xs opacity-60">
              {m.body}
            </div>
          );
        }
        const mine = m.direction === "OUTBOUND" && m.sender?.id === currentUserId;
        return (
          <div
            key={m.id}
            className={`chat ${m.direction === "OUTBOUND" ? "chat-end" : "chat-start"}`}
          >
            <div
              className={`chat-bubble ${
                mine
                  ? "chat-bubble-primary"
                  : m.direction === "OUTBOUND"
                    ? ""
                    : "chat-bubble-neutral"
              }`}
            >
              {m.mediaId ? <MediaBubble message={m} /> : m.body}
            </div>
            <div className="chat-footer text-xs opacity-50">
              {new Date(m.sentAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        );
      })}
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

  return (
    <form onSubmit={handleSubmit} className="border-t border-base-300 p-3 flex gap-2">
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        onChange={handleFile}
        disabled={disabled || sending}
      />
      <button
        type="button"
        className="btn btn-ghost btn-square btn-sm"
        aria-label="Anexar"
        onClick={() => fileInput.current?.click()}
        disabled={disabled || sending}
      >
        📎
      </button>
      <input
        type="text"
        className="input input-bordered flex-1"
        placeholder={disabled ? "Assuma a conversa para enviar mensagens" : "Digite uma mensagem..."}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled || sending}
      />
      <button type="submit" className="btn btn-primary" disabled={disabled || sending}>
        Enviar
      </button>
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
  const cls =
    status === "WAITING"
      ? "badge-warning"
      : status === "IN_PROGRESS"
        ? "badge-success"
        : "badge-ghost";
  const label =
    status === "WAITING"
      ? "Aguardando"
      : status === "IN_PROGRESS"
        ? "Em atendimento"
        : "Finalizada";
  return <span className={`badge badge-sm ${cls}`}>{label}</span>;
}
