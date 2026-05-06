import { useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "../../lib/apiClient";
import { useAuthStore } from "../../stores/authStore";
import { useDepartments } from "../../hooks/useDepartments";
import type { Role } from "@wpp/shared";
import { AdminPage } from "../../components/AdminPage";
import { Avatar } from "../../components/Avatar";
import { IconChevronDown, IconPlus, IconSearch, IconUsers } from "../../components/Icon";

type ApiUser = {
  id: string;
  email: string;
  fullName: string;
  photoUrl: string | null;
  role: Role;
  isActive: boolean;
  departmentIds: string[];
};

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  DEPT_ADMIN: "Admin",
  AGENT: "Atendente",
};

export function UsersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isSuper = role === "SUPER_ADMIN";
  const canManage = isSuper || role === "DEPT_ADMIN";
  const { items: departments } = useDepartments();

  const [items, setItems] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("");

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

  const filtered = useMemo(() => {
    return items.filter((u) => {
      if (deptFilter && !u.departmentIds.includes(deptFilter)) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [items, search, deptFilter]);

  return (
    <AdminPage
      title="Usuários"
      subtitle="Gerencie atendentes, administradores e seus vínculos com departamentos."
      actions={
        canManage && (
          <button
            type="button"
            className="btn-flat-primary"
            onClick={() => setCreating(true)}
          >
            <IconPlus size={16} /> Novo usuário
          </button>
        )
      }
    >
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 bg-base-200 rounded-full px-3.5 py-2 text-sm flex-1 min-w-[16rem] focus-within:ring-2 focus-within:ring-primary/30">
          <IconSearch size={15} />
          <input
            type="search"
            className="bg-transparent border-0 outline-none w-full placeholder:text-base-content/45"
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div className="relative">
          <select
            className="appearance-none bg-base-200 border-0 rounded-full pl-4 pr-10 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">Todos os departamentos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50">
            <IconChevronDown size={16} />
          </span>
        </div>
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
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((u) => (
            <UserCard key={u.id} user={u} departments={departments} />
          ))}
        </div>
      )}

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void refetch();
          }}
        />
      )}
    </AdminPage>
  );
}

function EmptyState() {
  return (
    <div className="surface-soft p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-base-100 grid place-items-center text-primary mb-4">
        <IconUsers size={22} />
      </div>
      <h3 className="font-semibold">Nenhum usuário encontrado</h3>
      <p className="text-sm text-base-content/55 mt-1">
        Ajuste os filtros ou cadastre um novo usuário.
      </p>
    </div>
  );
}

function UserCard({
  user,
  departments,
}: {
  user: ApiUser;
  departments: { id: string; name: string }[];
}) {
  const deptNames = user.departmentIds
    .map((id) => departments.find((d) => d.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <article className="surface-soft p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar
          name={user.fullName}
          src={user.photoUrl ?? undefined}
          sizeClass="w-12"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{user.fullName}</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/12 text-primary">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <div className="text-xs text-base-content/55 truncate mt-0.5">
            {user.email}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                user.isActive ? "bg-emerald-400" : "bg-base-content/30"
              }`}
            />
            <span className={user.isActive ? "text-emerald-600" : "text-base-content/55"}>
              {user.isActive ? "Disponível" : "Inativo"}
            </span>
          </div>
        </div>
      </div>

      {deptNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {deptNames.map((n) => (
            <span
              key={n}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-base-100 text-base-content/70"
            >
              {n}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
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
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <h3 className="text-lg font-bold">Novo usuário</h3>
          <p className="text-sm text-base-content/60">
            Cadastre um colaborador com seu papel e vínculos.
          </p>
        </div>

        <Field label="Nome completo">
          <input
            className="input-flat"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="E-mail">
            <input
              type="email"
              className="input-flat"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Senha (mín 8)">
            <input
              type="password"
              className="input-flat"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
        </div>

        <Field
          label="URL da foto"
          hint="Opcional para Admin. Obrigatório para Atendente."
        >
          <input
            className="input-flat"
            value={form.photoUrl}
            onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
          />
        </Field>

        <Field label="Papel">
          <div className="grid grid-cols-3 gap-1.5 bg-base-200 rounded-full p-1">
            {(["AGENT", "DEPT_ADMIN", "SUPER_ADMIN"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`text-xs font-semibold py-1.5 rounded-full transition ${
                  form.role === r
                    ? "bg-primary text-primary-content shadow"
                    : "text-base-content/60 hover:text-base-content"
                }`}
                onClick={() => setForm({ ...form, role: r })}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Departamentos">
          <div className="max-h-32 overflow-y-auto bg-base-200 rounded-2xl p-3 space-y-1.5 scrollbar-soft">
            {departments.length === 0 && (
              <p className="text-xs text-base-content/55">
                Nenhum departamento cadastrado.
              </p>
            )}
            {departments.map((d) => {
              const checked = form.departmentIds.includes(d.id);
              return (
                <label
                  key={d.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={checked}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        departmentIds: e.target.checked
                          ? [...f.departmentIds, d.id]
                          : f.departmentIds.filter((x) => x !== d.id),
                      }))
                    }
                  />
                  <span>{d.name}</span>
                </label>
              );
            })}
          </div>
        </Field>

        {error && (
          <div role="alert" className="text-sm text-error bg-error/10 rounded-2xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn-flat-neutral flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-flat-primary flex-1" disabled={submitting}>
            {submitting ? "Criando…" : "Criar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="surface-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-soft animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-base-content/70 mb-1.5">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-[11px] text-base-content/50 mt-1">{hint}</span>
      )}
    </label>
  );
}
