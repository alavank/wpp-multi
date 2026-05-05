import { useQueueStore, type QueueTabKey } from "../../stores/queueStore";

const TABS: { key: QueueTabKey; label: string }[] = [
  { key: "WAITING", label: "Aguardando" },
  { key: "IN_PROGRESS", label: "Em Atendimento" },
  { key: "FINISHED", label: "Finalizadas" },
  { key: "TRANSFERS_RECEIVED", label: "Transf. Receb." },
  { key: "TRANSFERS_SENT", label: "Transf. Env." },
];

export function QueueTabs() {
  const activeTab = useQueueStore((s) => s.activeTab);
  const setActiveTab = useQueueStore((s) => s.setActiveTab);

  return (
    <div role="tablist" className="tabs tabs-lifted tabs-sm bg-base-200 px-2 pt-2">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          className={`tab ${activeTab === t.key ? "tab-active" : ""}`}
          onClick={() => setActiveTab(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
