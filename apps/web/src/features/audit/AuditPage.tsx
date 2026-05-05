import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/apiClient";

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
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="navbar bg-base-200 px-4">
        <Link to="/" className="btn btn-ghost text-lg">← Filas</Link>
        <div className="flex-1 ml-4 text-lg font-semibold">Auditoria</div>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            className="input input-bordered input-sm"
            placeholder="Ação (ex: conversation.assume)"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          />
          <input
            type="text"
            className="input input-bordered input-sm"
            placeholder="User ID"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          />
          <button type="button" className="btn btn-sm" onClick={() => refetch()}>
            Filtrar
          </button>
        </div>

        {error && <div role="alert" className="alert alert-error text-sm">{error}</div>}
        {loading ? (
          <div className="text-center py-10"><span className="loading loading-spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Quem</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>IP</th>
                  <th>Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="tabular-nums whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td>{a.actorName ?? <span className="opacity-60">—</span>}</td>
                    <td><code>{a.action}</code></td>
                    <td className="text-xs opacity-70">
                      {a.entityType}
                      {a.entityId ? ` · ${a.entityId.slice(0, 8)}…` : ""}
                    </td>
                    <td className="text-xs">{a.ipAddress ?? "—"}</td>
                    <td className="text-xs">
                      {a.device ?? "—"}
                      {a.userAgent && (
                        <div className="opacity-50 truncate max-w-[12rem]" title={a.userAgent}>
                          {a.userAgent}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="text-center opacity-60 py-6">Nenhum log.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
