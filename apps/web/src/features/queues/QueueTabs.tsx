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
    <div role="tablist" className="flex flex-wrap gap-1 p-2 border-b border-base-300">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={activeTab === t.key}
          className={`btn btn-xs rounded-full ${
            activeTab === t.key ? "btn-primary" : "btn-ghost"
          }`}
          onClick={() => setActiveTab(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
