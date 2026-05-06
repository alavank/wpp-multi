import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../lib/apiClient";
import { AdminPage } from "../../components/AdminPage";

type ApiAudit = {
  id: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  location: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function AuditPage() {
  const [items, setItems] = useState<ApiAudit[]>([]);
  const [filters, setFilters] = useState({ action: "", userId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.set("action", filters.action);
      if (filters.userId) params.set("userId", filters.userId);
      const data = await apiFetch<{ items: ApiAudit[] }>(
        `/audit-logs${params.toString() ? "?" + params.toString() : ""}`,
      );
      setItems(data.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return (
    <AdminPage
      title="Auditoria"
      subtitle="Histórico cronológico de ações no sistema."
    >
      <div className="surface-soft p-4 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          className="input-flat flex-1 min-w-[14rem]"
          placeholder="Ação (ex.: conversation.assume)"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
        />
        <input
          type="text"
          className="input-flat flex-1 min-w-[14rem]"
          placeholder="User ID"
          value={filters.userId}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
        />
        <button type="button" className="btn-flat-primary" onClick={() => refetch()}>
          Filtrar
        </button>
      </div>

      {error && (
        <div role="alert" className="text-sm text-error bg-error/10 rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-16">
          <span className="loading loading-dots text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface-soft p-10 text-center text-sm text-base-content/55">
          Nenhum log encontrado.
        </div>
      ) : (
        <div className="surface-soft p-2 overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-base-content/55">
                <th className="px-3 py-2 font-semibold">Quando</th>
                <th className="px-3 py-2 font-semibold">Quem</th>
                <th className="px-3 py-2 font-semibold">Ação</th>
                <th className="px-3 py-2 font-semibold">Entidade</th>
                <th className="px-3 py-2 font-semibold">IP</th>
                <th className="px-3 py-2 font-semibold">Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t divider-hair">
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2">
                    {a.actorName ?? <span className="text-base-content/55">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <code className="text-xs">{a.action}</code>
                  </td>
                  <td className="px-3 py-2 text-xs text-base-content/70">
                    {a.entityType}
                    {a.entityId ? ` · ${a.entityId.slice(0, 8)}…` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">{a.ipAddress ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {a.device ?? "—"}
                    {a.userAgent && (
                      <div
                        className="text-base-content/45 truncate max-w-[12rem]"
                        title={a.userAgent}
                      >
                        {a.userAgent}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}
