import { useMemo, useState } from "react";
import { useQueueStore } from "../../stores/queueStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useConversations, type ApiConversation } from "../../hooks/useConversations";
import { Avatar } from "../../components/Avatar";
import { DepartmentTag } from "../../components/DepartmentTag";
import { relativeTime } from "../../lib/avatar";

export function ConversationList() {
  const activeTab = useQueueStore((s) => s.activeTab);
  const departmentId = useSelectionStore((s) => s.departmentId);
  const selectedId = useSelectionStore((s) => s.conversationId);
  const select = useSelectionStore((s) => s.selectConversation);
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      const name = nameOf(c).toLowerCase();
      return name.includes(q) || c.contact.phoneE164.includes(q);
    });
  }, [items, search]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 py-2 border-b border-base-300">
        <label className="input input-sm input-bordered flex items-center gap-2">
          <span aria-hidden>🔎</span>
          <input
            type="search"
            className="grow"
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <Body
        loading={loading}
        error={error}
        items={filtered}
        selectedId={selectedId}
        onSelect={select}
        empty={!departmentId ? "Selecione um departamento." : "Nenhuma conversa nesta aba."}
      />
    </div>
  );
}

function Body({
  loading,
  error,
  items,
  selectedId,
  onSelect,
  empty,
}: {
  loading: boolean;
  error: string | null;
  items: ApiConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  empty: string;
}) {
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
        {empty}
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
          onSelect={() => onSelect(c.id)}
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
  const name = nameOf(conv);
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" ? onSelect() : null)}
      className={`px-3 py-3 hover:bg-base-200 cursor-pointer flex items-center gap-3 transition-colors ${
        selected ? "bg-base-200" : ""
      }`}
    >
      <Avatar name={name} src={conv.contact.profilePicUrl ?? undefined} />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2 items-baseline">
          <span className="font-medium truncate">{name}</span>
          <span className="text-[11px] opacity-60 shrink-0">
            {relativeTime(conv.lastMessageAt ?? conv.waitingSince)}
          </span>
        </div>
        <div className="flex justify-between gap-2 items-center">
          <DepartmentTag departmentId={conv.departmentId} />
          {conv.unreadCount > 0 && (
            <span className="badge badge-primary badge-sm shrink-0">{conv.unreadCount}</span>
          )}
        </div>
        <div className="text-xs opacity-70 truncate mt-0.5">{conv.contact.phoneE164}</div>
      </div>
    </li>
  );
}

function nameOf(c: ApiConversation) {
  return c.contact.displayName ?? c.contact.pushName ?? c.contact.phoneE164;
}
