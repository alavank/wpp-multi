import { useQueueStore } from "../../stores/queueStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useConversations, type ApiConversation } from "../../hooks/useConversations";

export function ConversationList() {
  const activeTab = useQueueStore((s) => s.activeTab);
  const departmentId = useSelectionStore((s) => s.departmentId);
  const selectedId = useSelectionStore((s) => s.conversationId);
  const select = useSelectionStore((s) => s.selectConversation);

  if (activeTab === "TRANSFERS_RECEIVED" || activeTab === "TRANSFERS_SENT") {
    return (
      <div className="flex-1 flex items-center justify-center text-sm opacity-60 px-4 text-center">
        Visão de transferências será exibida aqui.
      </div>
    );
  }

  const status =
    activeTab === "WAITING"
      ? ("WAITING" as const)
      : activeTab === "IN_PROGRESS"
        ? ("IN_PROGRESS" as const)
        : ("FINISHED" as const);

  const { items, loading, error } = useConversations({
    departmentId,
    status,
    assignedToMe: activeTab === "IN_PROGRESS",
  });

  if (!departmentId) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm opacity-60 px-4 text-center">
        Selecione um departamento.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="loading loading-dots" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-error px-4 text-center">
        Erro: {error}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm opacity-60 px-4 text-center">
        Nenhuma conversa nesta aba.
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto divide-y divide-base-300">
      {items.map((c) => (
        <ConversationRow
          key={c.id}
          conv={c}
          selected={c.id === selectedId}
          onSelect={() => select(c.id)}
        />
      ))}
    </ul>
  );
}

function ConversationRow({
  conv,
  selected,
  onSelect,
}: {
  conv: ApiConversation;
  selected: boolean;
  onSelect: () => void;
}) {
  const name = conv.contact.displayName ?? conv.contact.pushName ?? conv.contact.phoneE164;
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" ? onSelect() : null)}
      className={`p-3 hover:bg-base-200 cursor-pointer flex items-center gap-3 ${
        selected ? "bg-base-200" : ""
      }`}
    >
      <div className="avatar placeholder">
        <div className="bg-neutral text-neutral-content rounded-full w-10">
          <span className="text-xs">{initials(name)}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2">
          <span className="font-medium truncate">{name}</span>
          {conv.unreadCount > 0 && (
            <span className="badge badge-primary badge-sm">{conv.unreadCount}</span>
          )}
        </div>
        <div className="text-xs opacity-70 truncate">{conv.contact.phoneE164}</div>
      </div>
    </li>
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
