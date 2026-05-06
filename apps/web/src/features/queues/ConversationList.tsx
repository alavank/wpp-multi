import { useMemo, useState } from "react";
import { useQueueStore } from "../../stores/queueStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useConversations, type ApiConversation } from "../../hooks/useConversations";
import { Avatar } from "../../components/Avatar";
import { DepartmentTag } from "../../components/DepartmentTag";
import { relativeTime } from "../../lib/avatar";
import { IconFilter, IconPlus, IconSearch } from "../../components/Icon";

export function ConversationList() {
  const activeTab = useQueueStore((s) => s.activeTab);
  const departmentId = useSelectionStore((s) => s.departmentId);
  const selectedId = useSelectionStore((s) => s.conversationId);
  const select = useSelectionStore((s) => s.selectConversation);
  const [search, setSearch] = useState("");

  const isTransferTab =
    activeTab === "TRANSFERS_RECEIVED" || activeTab === "TRANSFERS_SENT";

  const status =
    activeTab === "WAITING"
      ? ("WAITING" as const)
      : activeTab === "IN_PROGRESS"
        ? ("IN_PROGRESS" as const)
        : ("FINISHED" as const);

  const { items, loading, error } = useConversations({
    departmentId: isTransferTab ? null : departmentId,
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

  if (isTransferTab) {
    return (
      <div className="flex-1 grid place-items-center text-sm text-base-content/55 px-4 text-center">
        Visão de transferências será exibida aqui.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg tracking-tight">Conversas</h2>
          <div className="flex items-center gap-1">
            <button type="button" className="btn-icon" aria-label="Filtrar">
              <IconFilter size={15} />
            </button>
            <button type="button" className="btn-icon" aria-label="Nova conversa">
              <IconPlus size={15} />
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 bg-base-200 rounded-full px-3.5 py-2 text-sm text-base-content/60 focus-within:ring-2 focus-within:ring-primary/30">
          <IconSearch size={15} />
          <input
            type="search"
            className="bg-transparent border-0 outline-none w-full text-base-content placeholder:text-base-content/45"
            placeholder="Buscar conversa…"
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
      <div className="flex-1 grid place-items-center">
        <span className="loading loading-dots text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 grid place-items-center text-sm text-error px-4 text-center">
        Erro: {error}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex-1 grid place-items-center text-sm text-base-content/55 px-4 text-center">
        {empty}
      </div>
    );
  }
  return (
    <ul className="flex-1 overflow-y-auto scrollbar-soft px-2 pb-3 space-y-1">
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
      className={`px-3 py-2.5 rounded-2xl cursor-pointer flex items-center gap-3 transition-colors ${
        selected
          ? "bg-primary/10 ring-1 ring-primary/20"
          : "hover:bg-base-200/70"
      }`}
    >
      <div className="relative">
        <Avatar name={name} src={conv.contact.profilePicUrl ?? undefined} sizeClass="w-11" />
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-content text-[10px] font-bold shadow">
            {conv.unreadCount}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2 items-baseline">
          <span className="font-semibold truncate">{name}</span>
          <span className="text-[11px] text-base-content/50 shrink-0">
            {relativeTime(conv.lastMessageAt ?? conv.waitingSince)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <DepartmentTag departmentId={conv.departmentId} />
          <span className="text-xs text-base-content/55 truncate">
            {conv.contact.phoneE164}
          </span>
        </div>
      </div>
    </li>
  );
}

function nameOf(c: ApiConversation) {
  return c.contact.displayName ?? c.contact.pushName ?? c.contact.phoneE164;
}
