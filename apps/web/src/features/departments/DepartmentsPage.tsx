import { useEffect, useState } from "react";
import { useDepartments, type ApiDepartment } from "../../hooks/useDepartments";
import { useAuthStore } from "../../stores/authStore";
import { apiFetch } from "../../lib/apiClient";
import { AdminPage } from "../../components/AdminPage";
import { IconBuilding, IconPlus } from "../../components/Icon";

export function DepartmentsPage() {
  const { items, loading, error, refetch } = useDepartments();
  const role = useAuthStore((s) => s.user?.role);
  const isSuper = role === "SUPER_ADMIN";
  const [creating, setCreating] = useState(false);
  const [qrFor, setQrFor] = useState<ApiDepartment | null>(null);

  return (
    <AdminPage
      title="Departamentos"
      subtitle="Cada departamento tem seu próprio número de WhatsApp."
      actions={
        isSuper && (
          <button
            type="button"
            className="btn-flat-primary"
            onClick={() => setCreating(true)}
          >
            <IconPlus size={16} /> Novo departamento
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((d) => (
            <DepartmentCard
              key={d.id}
              dept={d}
              canManage={isSuper || true /* dept admin do dept */}
              onConnect={() => setQrFor(d)}
            />
          ))}
        </div>
      )}

      {creating && (
        <CreateDepartmentModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void refetch();
          }}
        />
      )}

      {qrFor && (
        <ConnectWhatsappModal
          dept={qrFor}
          onClose={() => setQrFor(null)}
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
      <h3 className="font-semibold">Nenhum departamento cadastrado</h3>
      <p className="text-sm text-base-content/55 mt-1">
        Crie um departamento para começar a vincular um número WhatsApp.
      </p>
    </div>
  );
}

function DepartmentCard({
  dept,
  canManage,
  onConnect,
}: {
  dept: ApiDepartment;
  canManage: boolean;
  onConnect: () => void;
}) {
  return (
    <article className="surface-soft p-5 flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/12 text-primary grid place-items-center shrink-0">
          <IconBuilding size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{dept.name}</h3>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                dept.isActive
                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                  : "bg-base-300 text-base-content/55"
              }`}
            >
              {dept.isActive ? "ativo" : "inativo"}
            </span>
          </div>
          {dept.description && (
            <p className="text-xs text-base-content/55 mt-0.5 line-clamp-2">
              {dept.description}
            </p>
          )}
        </div>
      </header>

      <div className="bg-base-100 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-base-content/55 font-semibold">
          Número
        </span>
        <span className="font-mono text-sm">{dept.whatsappNumber}</span>
      </div>

      {canManage && (
        <div className="flex gap-2">
          <WhatsappStatusButton dept={dept} onConnect={onConnect} />
        </div>
      )}
    </article>
  );
}

type WaSession = {
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "AUTH_FAILURE" | string;
  phoneNumber: string | null;
};

function WhatsappStatusButton({
  dept,
  onConnect,
}: {
  dept: ApiDepartment;
  onConnect: () => void;
}) {
  const [session, setSession] = useState<WaSession | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<WaSession>(`/whatsapp/sessions/${dept.id}`)
      .then((s) => alive && setSession(s))
      .catch(() => alive && setSession({ status: "DISCONNECTED", phoneNumber: null }));
    return () => {
      alive = false;
    };
  }, [dept.id]);

  const connected = session?.status === "CONNECTED";
  return (
    <button
      type="button"
      className={connected ? "btn-flat-neutral flex-1" : "btn-flat-primary flex-1"}
      onClick={onConnect}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          connected
            ? "bg-emerald-400"
            : session?.status === "CONNECTING"
              ? "bg-amber-400 animate-pulse"
              : "bg-base-content/30"
        }`}
      />
      {connected ? "WhatsApp conectado" : "Conectar via QR"}
    </button>
  );
}

function ConnectWhatsappModal({
  dept,
  onClose,
}: {
  dept: ApiDepartment;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<WaSession["status"]>("CONNECTING");

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function start() {
      try {
        await apiFetch(`/whatsapp/sessions/${dept.id}/start`, { method: "POST" });
        if (!alive) return;
        await loadQr();
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    async function loadQr() {
      try {
        const { loadMediaObjectUrl } = await import("../../lib/apiClient");
        // reaproveita o helper de blob com Authorization (apiFetch puro não baixa binário)
        const url = await loadAuthBlob(`/whatsapp/sessions/${dept.id}/qr.png`);
        if (!alive) return;
        if (qrUrl) URL.revokeObjectURL(qrUrl);
        setQrUrl(url);
        void loadMediaObjectUrl;
      } catch {
        // QR ainda não disponível — vai tentar de novo no próximo tick
      }
    }

    async function pollStatus() {
      try {
        const s = await apiFetch<WaSession>(`/whatsapp/sessions/${dept.id}`);
        if (!alive) return;
        setStatus(s.status);
        if (s.status !== "CONNECTED") void loadQr();
      } catch {
        /* silencioso — segue tentando */
      }
    }

    void start();
    timer = setInterval(pollStatus, 3000);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept.id]);

  const connected = status === "CONNECTED";

  return (
    <Modal onClose={onClose}>
      <div className="text-center space-y-4 max-w-sm mx-auto">
        <div className="space-y-1">
          <h3 className="text-lg font-bold">Conectar {dept.name}</h3>
          <p className="text-sm text-base-content/60">
            Abra o WhatsApp no celular do número <strong>{dept.whatsappNumber}</strong>,
            vá em <em>Aparelhos conectados</em> e escaneie.
          </p>
        </div>

        <div className="bg-base-200 rounded-2xl p-4 grid place-items-center min-h-[280px]">
          {connected ? (
            <div className="space-y-2 text-emerald-600 dark:text-emerald-300">
              <div className="text-3xl">✓</div>
              <div className="font-semibold">Conectado!</div>
            </div>
          ) : qrUrl ? (
            <img src={qrUrl} alt="QR code" className="w-64 h-64 rounded-xl bg-white p-2" />
          ) : loading ? (
            <span className="loading loading-dots text-primary" />
          ) : error ? (
            <p className="text-sm text-error">{error}</p>
          ) : (
            <p className="text-sm text-base-content/55">Aguardando QR…</p>
          )}
        </div>

        <button type="button" className="btn-flat-neutral w-full" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}

async function loadAuthBlob(path: string): Promise<string> {
  const { supabase } = await import("../../lib/supabaseClient");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
  const res = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
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

function CreateDepartmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/departments", {
        method: "POST",
        body: JSON.stringify({
          name,
          whatsappNumber,
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
          <h3 className="text-lg font-bold">Novo departamento</h3>
          <p className="text-sm text-base-content/60">
            Cadastre o setor e seu número de WhatsApp dedicado.
          </p>
        </div>

        <Field label="Nome">
          <input
            type="text"
            className="input-flat"
            placeholder="Ex.: Atendimento Cidadão"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Número WhatsApp" hint="Formato internacional. Ex.: +5511999999999">
          <input
            type="text"
            className="input-flat"
            placeholder="+55…"
            required
            pattern="\+\d{8,15}"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
          />
        </Field>

        <Field label="Descrição (opcional)">
          <input
            type="text"
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
