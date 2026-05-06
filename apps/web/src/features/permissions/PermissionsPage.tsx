import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/apiClient";
import { useDepartments } from "../../hooks/useDepartments";
import { AdminPage } from "../../components/AdminPage";

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
    <AdminPage
      title="Permissões"
      subtitle="Conceda ou revogue permissões granulares por usuário e departamento."
    >
      <div className="surface-soft p-5">
        <label className="block">
          <span className="block text-xs font-semibold text-base-content/70 mb-1.5">
            Usuário
          </span>
          <select
            className="input-flat"
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

      {error && (
        <div role="alert" className="text-sm text-error bg-error/10 rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      {selectedUser && (
        <>
          <section className="surface-soft p-5 space-y-4">
            <h2 className="font-bold">Conceder permissão</h2>
            <GrantForm
              catalog={catalog}
              departments={depts.map((d) => ({ id: d.id, name: d.name }))}
              onGrant={grant}
            />
          </section>

          <section className="surface-soft p-5 space-y-3">
            <h2 className="font-bold">Permissões atuais</h2>
            {grants.length === 0 ? (
              <p className="text-sm text-base-content/55">Nenhuma permissão concedida.</p>
            ) : (
              <ul className="space-y-2">
                {grants.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between gap-3 bg-base-100 rounded-2xl px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <code className="text-sm font-mono">{g.permission}</code>
                      <div className="text-[11px] text-base-content/55">
                        {g.departmentId
                          ? `Apenas em ${depts.find((d) => d.id === g.departmentId)?.name ?? g.departmentId}`
                          : "Escopo global"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-error hover:underline"
                      onClick={() => revoke(g.id)}
                    >
                      Revogar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AdminPage>
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
      <label className="block">
        <span className="block text-xs font-semibold text-base-content/70 mb-1.5">
          Permissão
        </span>
        <select
          className="input-flat"
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
      <label className="block">
        <span className="block text-xs font-semibold text-base-content/70 mb-1.5">
          Escopo
        </span>
        <select
          className="input-flat"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="global">Global (todos os departamentos)</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>Apenas: {d.name}</option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="btn-flat-primary"
        disabled={submitting || !permission}
      >
        Conceder
      </button>
    </form>
  );
}
