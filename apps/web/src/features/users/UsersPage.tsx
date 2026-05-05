import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/apiClient";
import { useAuthStore } from "../../stores/authStore";
import { useDepartments } from "../../hooks/useDepartments";
import type { Role } from "@wpp/shared";

type ApiUser = {
  id: string;
  email: string;
  fullName: string;
  photoUrl: string | null;
  role: Role;
  isActive: boolean;
  departmentIds: string[];
};

export function UsersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isSuper = role === "SUPER_ADMIN";
  const [items, setItems] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: ApiUser[] }>("/users");
      setItems(data.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="navbar bg-base-200 px-4">
        <Link to="/" className="btn btn-ghost text-lg">← Filas</Link>
        <div className="flex-1 ml-4 text-lg font-semibold">Usuários</div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {isSuper && <CreateUserForm onCreated={refetch} />}

        {loading ? (
          <div className="text-center py-10">
            <span className="loading loading-spinner" />
          </div>
        ) : error ? (
          <div role="alert" className="alert alert-error">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel</th>
                  <th>Departamentos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {u.photoUrl ? (
                          <img src={u.photoUrl} className="rounded-full w-8 h-8" alt={u.fullName} />
                        ) : (
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-8">
                              <span className="text-xs">{initials(u.fullName)}</span>
                            </div>
                          </div>
                        )}
                        <span>{u.fullName}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><span className="badge">{u.role}</span></td>
                    <td className="text-xs opacity-70">{u.departmentIds.length} vínculo(s)</td>
                    <td>
                      <span className={`badge ${u.isActive ? "badge-success" : "badge-ghost"}`}>
                        {u.isActive ? "ativo" : "inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center opacity-60 py-6">
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const { items: departments } = useDepartments();
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    photoUrl: "",
    role: "AGENT" as Role,
    password: "",
    departmentIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          photoUrl: form.photoUrl || undefined,
        }),
      });
      setForm({ email: "", fullName: "", photoUrl: "", role: "AGENT", password: "", departmentIds: [] });
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card bg-base-200" onSubmit={handleSubmit}>
      <div className="card-body space-y-2">
        <h2 className="card-title text-base">Novo usuário</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input input-bordered" placeholder="Nome completo" required
            value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className="input input-bordered" type="email" placeholder="E-mail" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input input-bordered" type="password" placeholder="Senha (mín 8)" required minLength={8}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="input input-bordered" placeholder="URL da foto (opcional p/ ADMIN, obrigatório p/ AGENT)"
            value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} />
          <select className="select select-bordered"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="AGENT">Atendente</option>
            <option value="DEPT_ADMIN">Admin de Departamento</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select className="select select-bordered"
            multiple value={form.departmentIds}
            onChange={(e) =>
              setForm({
                ...form,
                departmentIds: Array.from(e.target.selectedOptions).map((o) => o.value),
              })
            }>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        {error && <div role="alert" className="alert alert-error text-sm">{error}</div>}
        <div className="card-actions justify-end">
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
            {submitting ? "Criando..." : "Criar"}
          </button>
        </div>
      </div>
    </form>
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
