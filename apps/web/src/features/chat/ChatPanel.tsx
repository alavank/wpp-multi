import { useState } from "react";
import { useSelectionStore } from "../../stores/selectionStore";
import { useAuthStore } from "../../stores/authStore";
import { useMessages } from "../../hooks/useMessages";
import { apiFetch } from "../../lib/apiClient";
import { ScheduleReturnButton } from "../schedule-return/ScheduleReturnButton";
import { useConversations } from "../../hooks/useConversations";

type Props = { className?: string };

export function ChatPanel({ className }: Props) {
  const departmentId = useSelectionStore((s) => s.departmentId);
  const conversationId = useSelectionStore((s) => s.conversationId);
  const userId = useAuthStore((s) => s.user?.id);

  // Recupera a conversa selecionada a partir das listas em cache.
  const { items: allConvs, refetch: refetchConvs } = useConversations({
    departmentId,
  });
  const conversation = allConvs.find((c) => c.id === conversationId) ?? null;

  const { items: messages, sendText } = useMessages(conversationId);

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
        <div className="avatar placeholder">
          <div className="bg-neutral text-neutral-content rounded-full w-10">
            <span className="text-xs">{initials(contactName)}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{contactName}</div>
          <div className="text-xs opacity-60">
            {conversation.status} · {conversation.contact.phoneE164}
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

      <Composer disabled={!canSend} onSend={sendText} />
    </section>
  );
}

function MessageList({
  items,
  currentUserId,
}: {
  items: { id: string; body: string | null; direction: "INBOUND" | "OUTBOUND"; type: string; sentAt: string; sender: { id: string; fullName: string } | null }[];
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
                mine ? "chat-bubble-primary" : m.direction === "OUTBOUND" ? "" : "chat-bubble-neutral"
              }`}
            >
              {m.body}
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

function Composer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (body: string) => Promise<unknown>;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    setSending(true);
    try {
      await onSend(value.trim());
      setValue("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handle} className="border-t border-base-300 p-3 flex gap-2">
      <button type="button" className="btn btn-ghost btn-square btn-sm" aria-label="Anexar" disabled>
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
