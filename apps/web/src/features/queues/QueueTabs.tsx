import { useQueueStore, type QueueTabKey } from "../../stores/queueStore";

const TABS: { key: QueueTabKey; label: string }[] = [
  { key: "WAITING", label: "Aguardando" },
  { key: "IN_PROGRESS", label: "Em atend." },
  { key: "FINISHED", label: "Finalizadas" },
  { key: "TRANSFERS_RECEIVED", label: "Recebidas" },
  { key: "TRANSFERS_SENT", label: "Enviadas" },
];

export function QueueTabs() {
  const activeTab = useQueueStore((s) => s.activeTab);
  const setActiveTab = useQueueStore((s) => s.setActiveTab);

  return (
    <div
      role="tablist"
      className="flex flex-wrap gap-1.5 px-3 py-3 border-b divider-hair"
    >
      {TABS.map((t) => {
        const active = activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`tab-pill ${active ? "is-active" : "bg-base-200/60"}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
