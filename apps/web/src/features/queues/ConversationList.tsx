import { useQueueStore } from "../../stores/queueStore";
import { useAuthStore } from "../../stores/authStore";

export function ConversationList() {
  const activeTab = useQueueStore((s) => s.activeTab);
  const listFor = useQueueStore((s) => s.listFor);
  const userId = useAuthStore((s) => s.user?.id);
  const items = listFor(activeTab, userId);

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
        <li
          key={c.id}
          className="p-3 hover:bg-base-200 cursor-pointer flex items-center gap-3"
        >
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-10">
              <span className="text-xs">{initials(c.contactName)}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-2">
              <span className="font-medium truncate">{c.contactName}</span>
              {c.unreadCount > 0 && (
                <span className="badge badge-primary badge-sm">{c.unreadCount}</span>
              )}
            </div>
            <div className="text-xs opacity-70 truncate">
              {c.lastMessagePreview ?? c.contactPhone}
            </div>
          </div>
        </li>
      ))}
    </ul>
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
