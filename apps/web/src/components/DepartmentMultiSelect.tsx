import { useMemo, useState } from "react";
import { useDepartments } from "../hooks/useDepartments";
import { useSecretarias } from "../hooks/useSecretarias";
import { IconChevronDown, IconSearch } from "./Icon";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Filtra para mostrar apenas estes departmentIds (RBAC do DEPT_ADMIN). */
  allowedIds?: string[];
};

/**
 * Multi-seleção de departamentos com agrupamento por secretaria.
 * - Lista checkbox agrupada (cada secretaria é uma seção)
 * - Departamentos sem secretaria caem em "Sem secretaria"
 * - Busca por nome
 * - "Selecionar todos da secretaria"
 * - Contador na régua
 */
export function DepartmentMultiSelect({ value, onChange, allowedIds }: Props) {
  const { items: departments } = useDepartments();
  const { items: secretarias } = useSecretarias();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    let list = departments;
    if (allowedIds) list = list.filter((d) => allowedIds.includes(d.id));
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, allowedIds, search]);

  const groups = useMemo(() => {
    const map = new Map<string | null, typeof departments>();
    for (const d of filtered) {
      const key = d.secretariaId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    // ordenar: secretarias por nome, "sem secretaria" no fim
    const result: { id: string | null; name: string; depts: typeof departments }[] = [];
    for (const sec of secretarias) {
      const depts = map.get(sec.id);
      if (depts && depts.length > 0) {
        result.push({ id: sec.id, name: sec.name, depts });
        map.delete(sec.id);
      }
    }
    const orphans = map.get(null);
    if (orphans && orphans.length > 0) {
      result.push({ id: null, name: "Sem secretaria", depts: orphans });
    }
    return result;
  }, [filtered, secretarias]);

  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  }

  function toggleGroup(deptIds: string[]) {
    const allSelected = deptIds.every((id) => value.includes(id));
    if (allSelected) {
      onChange(value.filter((id) => !deptIds.includes(id)));
    } else {
      const next = new Set(value);
      deptIds.forEach((id) => next.add(id));
      onChange([...next]);
    }
  }

  const totalAvailable = filtered.length;

  return (
    <div className="bg-base-200 rounded-2xl overflow-hidden">
      {/* Régua */}
      <div className="px-3 py-2 flex items-center gap-2 border-b divider-hair">
        <IconSearch size={14} />
        <input
          type="search"
          className="bg-transparent border-0 outline-none text-sm flex-1 placeholder:text-base-content/45"
          placeholder="Buscar departamento…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-[11px] font-semibold text-base-content/55 tabular-nums">
          {value.length}/{totalAvailable}
        </span>
      </div>

      {/* Grupos */}
      <div className="max-h-64 overflow-y-auto scrollbar-soft">
        {groups.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-base-content/55">
            Nenhum departamento encontrado.
          </div>
        )}
        {groups.map((g) => {
          const groupKey = g.id ?? "__none__";
          const isCollapsed = !!collapsed[groupKey];
          const deptIds = g.depts.map((d) => d.id);
          const selectedInGroup = deptIds.filter((id) => value.includes(id)).length;
          const allSelected = selectedInGroup === deptIds.length && deptIds.length > 0;

          return (
            <div key={groupKey} className="border-t divider-hair first:border-t-0">
              <div className="px-3 py-2 flex items-center gap-2 bg-base-100/40">
                <button
                  type="button"
                  className="btn-icon !w-6 !h-6"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [groupKey]: !isCollapsed }))
                  }
                  aria-label={isCollapsed ? "Expandir" : "Recolher"}
                >
                  <IconChevronDown
                    size={14}
                    style={{
                      transform: isCollapsed ? "rotate(-90deg)" : undefined,
                      transition: "transform 0.18s",
                    }}
                  />
                </button>
                <span className="text-xs font-bold uppercase tracking-wider flex-1 truncate">
                  {g.name}
                </span>
                <span className="text-[10px] text-base-content/55 tabular-nums">
                  {selectedInGroup}/{deptIds.length}
                </span>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-primary hover:underline"
                  onClick={() => toggleGroup(deptIds)}
                >
                  {allSelected ? "limpar" : "todos"}
                </button>
              </div>

              {!isCollapsed && (
                <ul className="py-1">
                  {g.depts.map((d) => {
                    const checked = value.includes(d.id);
                    return (
                      <li key={d.id}>
                        <label className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-base-100/60 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm checkbox-primary"
                            checked={checked}
                            onChange={() => toggle(d.id)}
                          />
                          <span className="flex-1 truncate">{d.name}</span>
                          <span className="font-mono text-[10px] text-base-content/45">
                            {d.whatsappNumber}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
