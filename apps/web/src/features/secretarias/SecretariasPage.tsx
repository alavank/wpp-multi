import { useState } from "react";
import { useSecretarias, type ApiSecretaria } from "../../hooks/useSecretarias";
import { useAuthStore } from "../../stores/authStore";
import { apiFetch } from "../../lib/apiClient";
import { AdminPage } from "../../components/AdminPage";
import { IconBuilding, IconPlus } from "../../components/Icon";

export function SecretariasPage() {
  const { items, loading, error, refetch } = useSecretarias();
  const role = useAuthStore((s) => s.user?.role);
  const isSuper = role === "SUPER_ADMIN";
  const [creating, setCreating] = useState(false);

  return (
    <AdminPage
      title="Secretarias"
      subtitle="Agrupamentos administrativos. Cada secretaria reúne vários departamentos."
      actions={
        isSuper && (
          <button
            type="button"
            className="btn-flat-primary"
            onClick={() => setCreating(true)}
          >
            <IconPlus size={16} /> Nova secretaria
          </button>
        )
      }
    >
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
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((s) => (
            <SecretariaCard key={s.id} sec={s} />
          ))}
        </div>
      )}

      {creating && (
        <CreateModal
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
        <IconBuilding size={22} />
      </div>
      <h3 className="font-semibold">Nenhuma secretaria cadastrada</h3>
      <p className="text-sm text-base-content/55 mt-1">
        Crie a primeira secretaria para agrupar departamentos por área.
      </p>
    </div>
  );
}

function SecretariaCard({ sec }: { sec: ApiSecretaria }) {
  return (
    <article className="surface-soft p-5 flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/12 text-primary grid place-items-center shrink-0">
          <IconBuilding size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{sec.name}</h3>
          {sec.description && (
            <p className="text-xs text-base-content/55 mt-0.5 line-clamp-2">
              {sec.description}
            </p>
          )}
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            sec.isActive
              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              : "bg-base-300 text-base-content/55"
          }`}
        >
          {sec.isActive ? "ativa" : "inativa"}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-2 text-center">
        <Stat label="Departamentos" value={sec._count?.departments ?? 0} />
        <Stat label="Usuários" value={sec._count?.users ?? 0} />
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-base-100 rounded-xl py-2">
      <div className="font-bold text-lg tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-base-content/55">
        {label}
      </div>
    </div>
  );
}

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/secretarias", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || undefined,
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
    <Modal onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <h3 className="text-lg font-bold">Nova secretaria</h3>
          <p className="text-sm text-base-content/60">
            Ex.: Saúde, Educação, Obras, Fazenda…
          </p>
        </div>

        <Field label="Nome">
          <input
            className="input-flat"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Descrição (opcional)">
          <input
            className="input-flat"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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
    </Modal>
  );
}

function Modal({
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
        className="surface-card p-6 w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-base-content/70 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
