import { useEffect, useMemo, useState } from "react";
import { useDepartments, type ApiDepartment } from "../../hooks/useDepartments";
import { useAuthStore } from "../../stores/authStore";
import { apiFetch } from "../../lib/apiClient";
import { buildTree, type OrgNode } from "../../lib/orgTree";
import { AdminPage } from "../../components/AdminPage";
import {
  IconBuilding,
  IconChevronDown,
  IconPlus,
} from "../../components/Icon";

const KIND_PRESETS = [
  "ORGANIZACAO",
  "SECRETARIA",
  "COORDENACAO",
  "DEPARTAMENTO",
  "SETOR",
  "EQUIPE",
];
const DEFAULT_KIND = "DEPARTAMENTO";

export function DepartmentsPage() {
  const { items, loading, error, refetch } = useDepartments();
  const role = useAuthStore((s) => s.user?.role);
  const isSuper = role === "SUPER_ADMIN";

  const tree = useMemo(() => buildTree(items), [items]);

  const [createUnder, setCreateUnder] = useState<ApiDepartment | null | "root">(
    null,
  );
  const [editing, setEditing] = useState<ApiDepartment | null>(null);
  const [qrFor, setQrFor] = useState<ApiDepartment | null>(null);

  return (
    <AdminPage
      title="Estrutura organizacional"
      subtitle="Monte o organograma do jeito que a organização funciona: organização, secretaria, departamento, setor ou qualquer outro nível."
      actions={
        isSuper && (
          <button
            type="button"
            className="btn-flat-primary"
            onClick={() => setCreateUnder("root")}
          >
            <IconPlus size={16} /> Nova raiz
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
      ) : tree.length === 0 ? (
        <EmptyState onCreate={() => setCreateUnder("root")} canCreate={isSuper} />
      ) : (
        <div className="space-y-2">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              canManage={isSuper}
              onAddBelow={(parent) => setCreateUnder(parent)}
              onEdit={(d) => setEditing(d)}
              onConnect={(d) => setQrFor(d)}
              onChange={refetch}
            />
          ))}
        </div>
      )}

      {createUnder !== null && (
        <CreateModal
          parent={createUnder === "root" ? null : createUnder}
          onClose={() => setCreateUnder(null)}
          onCreated={() => {
            setCreateUnder(null);
            void refetch();
          }}
        />
      )}

      {editing && (
        <EditModal
          dept={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refetch();
          }}
        />
      )}

      {qrFor && <ConnectWhatsappModal dept={qrFor} onClose={() => setQrFor(null)} />}
    </AdminPage>
  );
}

function EmptyState({
  onCreate,
  canCreate,
}: {
  onCreate: () => void;
  canCreate: boolean;
}) {
  return (
    <div className="surface-soft p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-base-100 grid place-items-center text-primary mb-4">
        <IconBuilding size={22} />
      </div>
      <h3 className="font-semibold">Nada cadastrado ainda</h3>
      <p className="text-sm text-base-content/55 mt-1 mb-4">
        Comece criando a organização-raiz (ex.: Prefeitura Municipal de…).
      </p>
      {canCreate && (
        <button type="button" className="btn-flat-primary" onClick={onCreate}>
          <IconPlus size={16} /> Criar raiz
        </button>
      )}
    </div>
  );
}

function TreeNode({
  node,
  canManage,
  onAddBelow,
  onEdit,
  onConnect,
  onChange,
}: {
  node: OrgNode;
  canManage: boolean;
  onAddBelow: (parent: ApiDepartment) => void;
  onEdit: (d: ApiDepartment) => void;
  onConnect: (d: ApiDepartment) => void;
  onChange: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;

  async function handleDelete() {
    if (!confirm(`Excluir "${node.name}"? Os filhos também serão removidos.`)) return;
    await apiFetch(`/departments/${node.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="space-y-2">
      <div
        className="surface-soft px-4 py-3 flex items-center gap-3"
        style={{ marginLeft: node.depth * 24 }}
      >
        <button
          type="button"
          className="btn-icon !w-7 !h-7"
          onClick={() => setCollapsed((c) => !c)}
          disabled={!hasChildren}
          aria-label={collapsed ? "Expandir" : "Recolher"}
        >
          {hasChildren ? (
            <IconChevronDown
              size={14}
              style={{
                transform: collapsed ? "rotate(-90deg)" : undefined,
                transition: "transform 0.18s",
              }}
            />
          ) : (
            <span className="w-1 h-1 rounded-full bg-base-content/30" />
          )}
        </button>

        <div className="w-9 h-9 rounded-xl bg-primary/12 text-primary grid place-items-center shrink-0">
          <IconBuilding size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-base-100 text-base-content/70">
              {node.kind}
            </span>
            <span className="font-semibold truncate">{node.name}</span>
            {node.whatsappNumber && (
              <span className="font-mono text-[11px] text-base-content/55">
                {node.whatsappNumber}
              </span>
            )}
            {hasChildren && (
              <span className="text-[10px] text-base-content/55">
                {node.children.length} subestrutura
                {node.children.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {node.description && (
            <div className="text-xs text-base-content/55 mt-0.5 truncate">
              {node.description}
            </div>
          )}
        </div>

        {node.whatsappNumber && canManage && (
          <button
            type="button"
            className="btn-flat-neutral text-xs"
            onClick={() => onConnect(node)}
          >
            Conectar QR
          </button>
        )}
        {canManage && (
          <>
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => onAddBelow(node)}
            >
              + Adicionar abaixo
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-base-content/70 hover:underline"
              onClick={() => onEdit(node)}
            >
              Editar
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-error hover:underline"
              onClick={handleDelete}
            >
              Excluir
            </button>
          </>
        )}
      </div>

      {!collapsed &&
        node.children.map((c) => (
          <TreeNode
            key={c.id}
            node={c}
            canManage={canManage}
            onAddBelow={onAddBelow}
            onEdit={onEdit}
            onConnect={onConnect}
            onChange={onChange}
          />
        ))}
    </div>
  );
}

function CreateModal({
  parent,
  onClose,
  onCreated,
}: {
  parent: ApiDepartment | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState(parent ? DEFAULT_KIND : "ORGANIZACAO");
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
          kind,
          parentId: parent?.id ?? null,
          description: description || undefined,
          whatsappNumber: whatsappNumber || null,
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
          <h3 className="text-lg font-bold">
            {parent ? "Adicionar abaixo de" : "Nova raiz"}
          </h3>
          {parent ? (
            <p className="text-sm text-base-content/60">
              Pai: <strong>{parent.name}</strong> ({parent.kind})
            </p>
          ) : (
            <p className="text-sm text-base-content/60">
              Topo do organograma. Ex.: <em>Prefeitura Municipal de…</em>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nomenclatura">
            <KindSelect value={kind} onChange={setKind} />
          </Field>
          <Field label="Nome">
            <input
              className="input-flat"
              required
              placeholder="Ex.: Secretaria de Saúde"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Número WhatsApp (opcional)"
          hint="Preencha apenas se este nó vai ter sua própria fila. Formato: +5511999999999"
        >
          <input
            className="input-flat"
            placeholder="+55…"
            pattern="\+\d{8,15}"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
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

function EditModal({
  dept,
  onClose,
  onSaved,
}: {
  dept: ApiDepartment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(dept.name);
  const [kind, setKind] = useState(dept.kind);
  const [whatsappNumber, setWhatsappNumber] = useState(dept.whatsappNumber ?? "");
  const [description, setDescription] = useState(dept.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/departments/${dept.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          kind,
          whatsappNumber: whatsappNumber || null,
          description: description || null,
        }),
      });
      onSaved();
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
          <h3 className="text-lg font-bold">Editar nó</h3>
          <p className="text-sm text-base-content/60">{dept.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nomenclatura">
            <KindSelect value={kind} onChange={setKind} />
          </Field>
          <Field label="Nome">
            <input
              className="input-flat"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Número WhatsApp (opcional)">
          <input
            className="input-flat"
            placeholder="+55…"
            pattern="\+\d{8,15}"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
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
            {submitting ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function KindSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <input
        className="input-flat"
        list="org-kind-presets"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="DEPARTAMENTO"
      />
      <datalist id="org-kind-presets">
        {KIND_PRESETS.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
    </>
  );
}

type WaSession = {
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "AUTH_FAILURE" | string;
  phoneNumber: string | null;
};

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
        const url = await loadAuthBlob(`/whatsapp/sessions/${dept.id}/qr.png`);
        if (!alive) return;
        if (qrUrl) URL.revokeObjectURL(qrUrl);
        setQrUrl(url);
      } catch {
        // ainda não disponível
      }
    }

    async function pollStatus() {
      try {
        const s = await apiFetch<WaSession>(`/whatsapp/sessions/${dept.id}`);
        if (!alive) return;
        setStatus(s.status);
        if (s.status !== "CONNECTED") void loadQr();
      } catch {
        /* silencioso */
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
            Abra o WhatsApp do número <strong>{dept.whatsappNumber}</strong>, vá
            em <em>Aparelhos conectados</em> e escaneie.
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
