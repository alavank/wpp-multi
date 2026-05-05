import { useEffect } from "react";
import { useDepartments } from "../../hooks/useDepartments";
import { useSelectionStore } from "../../stores/selectionStore";

export function DepartmentSelector() {
  const { items, loading } = useDepartments();
  const selected = useSelectionStore((s) => s.departmentId);
  const setDept = useSelectionStore((s) => s.setDepartment);

  // Auto-seleciona o primeiro quando carrega.
  useEffect(() => {
    if (!selected && items.length > 0) setDept(items[0]!.id);
  }, [items, selected, setDept]);

  if (loading) {
    return <div className="px-3 py-2 text-xs opacity-60">Carregando departamentos…</div>;
  }
  if (items.length === 0) {
    return (
      <div className="px-3 py-2 text-xs opacity-60">
        Nenhum departamento disponível.
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-base-300">
      <select
        className="select select-bordered select-sm w-full"
        value={selected ?? ""}
        onChange={(e) => setDept(e.target.value || null)}
      >
        {items.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </div>
  );
}
