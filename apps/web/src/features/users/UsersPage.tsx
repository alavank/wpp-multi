import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { apiFetch } from "../../lib/apiClient";
import { uploadAvatar } from "../../lib/avatarUpload";
import { useAuthStore } from "../../stores/authStore";
import { useDepartments } from "../../hooks/useDepartments";
import { useSecretarias } from "../../hooks/useSecretarias";
import type { Role } from "@wpp/shared";
import { AdminPage } from "../../components/AdminPage";
import { Avatar } from "../../components/Avatar";
import {
  IconChevronDown,
  IconPlus,
  IconSearch,
  IconUsers,
} from "../../components/Icon";

type ApiUser = {
  id: string;
  email: string;
  fullName: string;
  photoUrl: string | null;
  cpf: string | null;
  bio: string | null;
  role: Role;
  isActive: boolean;
  secretariaId: string | null;
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
  const { items: secretarias } = useSecretarias();

  const [items, setItems] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [secFilter, setSecFilter] = useState<string>("");
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
      if (secFilter && u.secretariaId !== secFilter) return false;
      if (deptFilter && !u.departmentIds.includes(deptFilter)) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.cpf ?? "").includes(q)
      );
    });
  }, [items, search, secFilter, deptFilter]);

  // Departamentos disponíveis no filtro (limitados pela secretaria escolhida)
  const deptOptions = useMemo(() => {
    if (!secFilter) return departments;
    return departments.filter((d) => d.secretariaId === secFilter);
  }, [departments, secFilter]);

  return (
    <AdminPage
      title="Usuários"
      subtitle="Atendentes e administradores agrupados por secretaria e departamento."
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
      <div className="space-y-3">
        <label className="flex items-center gap-2 bg-base-200 rounded-full px-3.5 py-2 text-sm focus-within:ring-2 focus-within:ring-primary/30">
          <IconSearch size={15} />
          <input
            type="search"
            className="bg-transparent border-0 outline-none w-full placeholder:text-base-content/45"
            placeholder="Buscar por nome, e-mail ou CPF…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <SelectPill
            label="Secretaria"
            value={secFilter}
            onChange={(v) => {
              setSecFilter(v);
              setDeptFilter("");
            }}
            options={[
              { value: "", label: "Todas as secretarias" },
              ...secretarias.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <SelectPill
            label="Departamento"
            value={deptFilter}
            onChange={setDeptFilter}
            options={[
              { value: "", label: "Todos os departamentos" },
              ...deptOptions.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
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
            <UserCard
              key={u.id}
              user={u}
              departments={departments}
              secretarias={secretarias}
            />
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

function SelectPill({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        className="appearance-none bg-base-200 border-0 rounded-full pl-4 pr-10 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50">
        <IconChevronDown size={16} />
      </span>
    </label>
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
  secretarias,
}: {
  user: ApiUser;
  departments: { id: string; name: string }[];
  secretarias: { id: string; name: string }[];
}) {
  const deptNames = user.departmentIds
    .map((id) => departments.find((d) => d.id === id)?.name)
    .filter(Boolean) as string[];
  const secName = user.secretariaId
    ? secretarias.find((s) => s.id === user.secretariaId)?.name
    : null;

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
          {user.cpf && (
            <div className="text-[11px] text-base-content/45 mt-0.5">
              CPF {formatCpf(user.cpf)}
            </div>
          )}
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

      {(secName || deptNames.length > 0) && (
        <div className="space-y-1.5">
          {secName && (
            <div className="text-[11px] font-semibold text-base-content/55 uppercase tracking-wider">
              {secName}
            </div>
          )}
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
  const { items: secretarias } = useSecretarias();
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    email: "",
    fullName: "",
    cpf: "",
    role: "AGENT" as Role,
    password: "",
    secretariaId: "",
    departmentIds: [] as string[],
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Departamentos limitados à secretaria escolhida
  const deptOptions = useMemo(() => {
    if (!form.secretariaId) return departments;
    return departments.filter((d) => d.secretariaId === form.secretariaId);
  }, [departments, form.secretariaId]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPhotoFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPhotoPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.role === "AGENT" && !photoFile) {
      setError("Atendentes exigem foto.");
      return;
    }

    setSubmitting(true);
    try {
      // 1) cria o usuário sem foto
      const created = await apiFetch<{ id: string }>("/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          fullName: form.fullName,
          cpf: form.cpf.replace(/\D/g, ""),
          password: form.password,
          role: form.role,
          secretariaId: form.secretariaId || undefined,
          departmentIds: form.departmentIds,
        }),
      });

      // 2) upload do avatar (com resize 300x300) num passo separado
      if (photoFile) {
        await uploadAvatar(created.id, photoFile);
      }

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
            Cadastre nome, CPF, vínculos e (opcionalmente) a foto. O atendente
            poderá completar bio e foto depois ao logar.
          </p>
        </div>

        {/* Foto */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="prévia"
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-base-200 grid place-items-center text-base-content/40 text-xs">
                sem foto
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <button
              type="button"
              className="btn-flat-neutral"
              onClick={() => fileInput.current?.click()}
            >
              {photoFile ? "Trocar foto" : "Carregar foto"}
            </button>
            <p className="text-[11px] text-base-content/50 mt-1">
              Será redimensionada para 300×300 e comprimida ao salvar.
            </p>
          </div>
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
          <Field label="CPF" hint="Apenas números">
            <input
              className="input-flat"
              required
              inputMode="numeric"
              maxLength={14}
              value={form.cpf}
              onChange={(e) =>
                setForm({ ...form, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })
              }
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              className="input-flat"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
        </div>

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

        <Field label="Secretaria">
          <SelectPlain
            value={form.secretariaId}
            onChange={(v) => setForm({ ...form, secretariaId: v, departmentIds: [] })}
            options={[
              { value: "", label: "— sem secretaria —" },
              ...secretarias.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </Field>

        <Field label="Departamentos">
          {deptOptions.length === 0 ? (
            <p className="text-xs text-base-content/55 bg-base-200 rounded-2xl p-3">
              {form.secretariaId
                ? "Esta secretaria ainda não tem departamentos."
                : "Nenhum departamento cadastrado."}
            </p>
          ) : (
            <div className="max-h-32 overflow-y-auto bg-base-200 rounded-2xl p-3 space-y-1.5 scrollbar-soft">
              {deptOptions.map((d) => {
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
          )}
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

function SelectPlain({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        className="input-flat appearance-none pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50">
        <IconChevronDown size={16} />
      </span>
    </div>
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

function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
