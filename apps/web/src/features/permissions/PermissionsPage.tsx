import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/apiClient";
import { useDepartments } from "../../hooks/useDepartments";

type ApiUserMin = { id: string; fullName: string; email: string };
type ApiPermission = {
  id: string;
  userId: string;
  permission: string;
  departmentId: string | null;
  createdAt: string;
};

export function PermissionsPage() {
  const { items: depts } = useDepartments();
  const [users, setUsers] = useState<ApiUserMin[]>([]);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [grants, setGrants] = useState<ApiPermission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: ApiUserMin[] }>("/users")
      .then((d) => setUsers(d.items))
      .catch((e) => setError((e as Error).message));
    apiFetch<{ permissions: string[] }>("/permissions/catalog")
      .then((d) => setCatalog(d.permissions))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setGrants([]);
      return;
    }
    apiFetch<{ items: ApiPermission[] }>(`/permissions/user/${selectedUser}`)
      .then((d) => setGrants(d.items))
      .catch((e) => setError((e as Error).message));
  }, [selectedUser]);

  async function reloadGrants() {
    if (!selectedUser) return;
    const d = await apiFetch<{ items: ApiPermission[] }>(`/permissions/user/${selectedUser}`);
    setGrants(d.items);
  }

  async function grant(permission: string, departmentId: string | null) {
    setError(null);
    try {
      await apiFetch("/permissions/grant", {
        method: "POST",
        body: JSON.stringify({ userId: selectedUser, permission, departmentId }),
      });
      await reloadGrants();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function revoke(id: string) {
    setError(null);
    try {
      await apiFetch(`/permissions/${id}`, { method: "DELETE" });
      await reloadGrants();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="navbar bg-base-200 px-4">
        <Link to="/" className="btn btn-ghost text-lg">← Filas</Link>
        <div className="flex-1 ml-4 text-lg font-semibold">Permissões</div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="form-control">
            <span className="label-text">Usuário</span>
            <select
              className="select select-bordered"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">— selecione —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <div role="alert" className="alert alert-error text-sm">{error}</div>}

        {selectedUser && (
          <>
            <section className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">Conceder permissão</h2>
                <GrantForm
                  catalog={catalog}
                  departments={depts.map((d) => ({ id: d.id, name: d.name }))}
                  onGrant={grant}
                />
              </div>
            </section>

            <section className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">Permissões atuais</h2>
                {grants.length === 0 ? (
                  <p className="opacity-60 text-sm">Nenhuma permissão concedida.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Permissão</th>
                          <th>Escopo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {grants.map((g) => (
                          <tr key={g.id}>
                            <td><code>{g.permission}</code></td>
                            <td>
                              {g.departmentId
                                ? depts.find((d) => d.id === g.departmentId)?.name ?? g.departmentId
                                : <span className="opacity-60">global</span>}
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => revoke(g.id)}
                              >
                                Revogar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function GrantForm({
  catalog,
  departments,
  onGrant,
}: {
  catalog: string[];
  departments: { id: string; name: string }[];
  onGrant: (perm: string, departmentId: string | null) => Promise<void>;
}) {
  const [permission, setPermission] = useState("");
  const [scope, setScope] = useState<string>("global");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!permission) return;
    setSubmitting(true);
    try {
      await onGrant(permission, scope === "global" ? null : scope);
      setPermission("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-3 items-end">
      <label className="form-control">
        <span className="label-text">Permissão</span>
        <select
          className="select select-bordered"
          value={permission}
          onChange={(e) => setPermission(e.target.value)}
          required
        >
          <option value="">— selecione —</option>
          {catalog.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <label className="form-control">
        <span className="label-text">Escopo</span>
        <select
          className="select select-bordered"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="global">Global (todos os departamentos)</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>Apenas: {d.name}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-primary" disabled={submitting || !permission}>
        Conceder
      </button>
    </form>
  );
}
