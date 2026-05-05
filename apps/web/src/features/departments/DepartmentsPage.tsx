import { useState } from "react";
import { Link } from "react-router-dom";
import { useDepartments } from "../../hooks/useDepartments";
import { useAuthStore } from "../../stores/authStore";
import { apiFetch } from "../../lib/apiClient";

export function DepartmentsPage() {
  const { items, loading, error, refetch } = useDepartments();
  const role = useAuthStore((s) => s.user?.role);
  const isSuper = role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="navbar bg-base-200 px-4">
        <Link to="/" className="btn btn-ghost text-lg">← Filas</Link>
        <div className="flex-1 ml-4 text-lg font-semibold">Departamentos</div>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {isSuper && <CreateDepartmentForm onCreated={refetch} />}

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
                  <th>Número WhatsApp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="font-medium">{d.name}</div>
                      {d.description && (
                        <div className="text-xs opacity-60">{d.description}</div>
                      )}
                    </td>
                    <td className="font-mono">{d.whatsappNumber}</td>
                    <td>
                      <span className={`badge ${d.isActive ? "badge-success" : "badge-ghost"}`}>
                        {d.isActive ? "ativo" : "inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center opacity-60 py-6">
                      Nenhum departamento cadastrado.
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

function CreateDepartmentForm({ onCreated }: { onCreated: () => void }) {
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
        body: JSON.stringify({ name, whatsappNumber, description: description || undefined }),
      });
      setName("");
      setWhatsappNumber("");
      setDescription("");
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card bg-base-200" onSubmit={handleSubmit}>
      <div className="card-body">
        <h2 className="card-title text-base">Novo departamento</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            type="text"
            className="input input-bordered"
            placeholder="Nome"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            className="input input-bordered"
            placeholder="+55119..."
            required
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
          />
          <input
            type="text"
            className="input input-bordered"
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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
