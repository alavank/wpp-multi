import { useEffect } from "react";
import { useDepartments } from "../../hooks/useDepartments";
import { useSelectionStore } from "../../stores/selectionStore";
import { IconChevronDown } from "../../components/Icon";

export function DepartmentSelector() {
  const { items, loading } = useDepartments();
  const selected = useSelectionStore((s) => s.departmentId);
  const setDept = useSelectionStore((s) => s.setDepartment);

  useEffect(() => {
    if (!selected && items.length > 0) setDept(items[0]!.id);
  }, [items, selected, setDept]);

  if (loading) {
    return (
      <div className="px-4 pt-4">
        <div className="h-9 rounded-full bg-base-200 animate-pulse" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="px-4 pt-4 text-xs text-base-content/55">
        Nenhum departamento disponível.
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <div className="relative">
        <select
          className="w-full appearance-none bg-base-200 border-0 rounded-full pl-4 pr-10 py-2 text-sm font-medium text-base-content focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={selected ?? ""}
          onChange={(e) => setDept(e.target.value || null)}
        >
          {items.map((d) => (
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
  );
}
