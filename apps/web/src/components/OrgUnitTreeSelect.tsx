import { useMemo, useState } from "react";
import { useDepartments } from "../hooks/useDepartments";
import { buildTree, flattenSubtree, type OrgNode } from "../lib/orgTree";
import { IconChevronDown, IconSearch } from "./Icon";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Filtra para mostrar apenas estes ids (RBAC do DEPT_ADMIN). */
  allowedIds?: string[];
};

/**
 * Multi-seleção em árvore. Cada nó (organização, secretaria, departamento,
 * setor, …) tem checkbox e pode ter filhos colapsáveis. "Marcar bloco"
 * inclui o nó e todos os descendentes visíveis.
 */
export function OrgUnitTreeSelect({ value, onChange, allowedIds }: Props) {
  const { items } = useDepartments();
  const [search, setSearch] = useState("");

  const tree = useMemo(() => {
    const filtered = allowedIds
      ? items.filter((d) => allowedIds.includes(d.id))
      : items;
    return buildTree(filtered);
  }, [items, allowedIds]);

  // Filtragem por busca: exibe nós que casam OU que têm descendente que casa
  const visible = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.trim().toLowerCase();
    function pruneRec(nodes: OrgNode[]): OrgNode[] {
      const out: OrgNode[] = [];
      for (const n of nodes) {
        const matches = n.name.toLowerCase().includes(q);
        const kids = pruneRec(n.children);
        if (matches || kids.length > 0) {
          out.push({ ...n, children: kids });
        }
      }
      return out;
    }
    return pruneRec(tree);
  }, [tree, search]);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  function toggleSubtree(node: OrgNode) {
    const ids = flattenSubtree(node).map((n) => n.id);
    const allSelected = ids.every((id) => value.includes(id));
    if (allSelected) {
      onChange(value.filter((id) => !ids.includes(id)));
    } else {
      const next = new Set(value);
      ids.forEach((id) => next.add(id));
      onChange([...next]);
    }
  }

  const totalAvailable = useMemo(() => {
    function count(nodes: OrgNode[]): number {
      return nodes.reduce((acc, n) => acc + 1 + count(n.children), 0);
    }
    return count(tree);
  }, [tree]);

  return (
    <div className="bg-base-200 rounded-2xl overflow-hidden">
      {/* Régua */}
      <div className="px-3 py-2 flex items-center gap-2 border-b divider-hair">
        <IconSearch size={14} />
        <input
          type="search"
          className="bg-transparent border-0 outline-none text-sm flex-1 placeholder:text-base-content/45"
          placeholder="Buscar local…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-[11px] font-semibold text-base-content/55 tabular-nums">
          {value.length}/{totalAvailable}
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto scrollbar-soft p-2">
        {visible.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-base-content/55">
            Nenhum local encontrado.
          </div>
        ) : (
          visible.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              value={value}
              onToggle={toggle}
              onToggleSubtree={toggleSubtree}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TreeRow({
  node,
  value,
  onToggle,
  onToggleSubtree,
}: {
  node: OrgNode;
  value: string[];
  onToggle: (id: string) => void;
  onToggleSubtree: (n: OrgNode) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;
  const checked = value.includes(node.id);

  return (
    <>
      <div
        className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-base-100/60 rounded-lg"
        style={{ paddingLeft: 8 + node.depth * 18 }}
      >
        <button
          type="button"
          className="btn-icon !w-5 !h-5"
          disabled={!hasChildren}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expandir" : "Recolher"}
        >
          {hasChildren ? (
            <IconChevronDown
              size={12}
              style={{
                transform: collapsed ? "rotate(-90deg)" : undefined,
                transition: "transform 0.18s",
              }}
            />
          ) : (
            <span className="w-1 h-1 rounded-full bg-base-content/25" />
          )}
        </button>
        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary"
            checked={checked}
            onChange={() => onToggle(node.id)}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-base-100 text-base-content/65 shrink-0">
            {node.kind}
          </span>
          <span className="truncate">{node.name}</span>
          {node.whatsappNumber && (
            <span className="font-mono text-[10px] text-base-content/45 shrink-0">
              {node.whatsappNumber}
            </span>
          )}
        </label>
        {hasChildren && (
          <button
            type="button"
            className="text-[10px] font-semibold text-primary hover:underline shrink-0"
            onClick={() => onToggleSubtree(node)}
          >
            bloco
          </button>
        )}
      </div>
      {!collapsed &&
        node.children.map((c) => (
          <TreeRow
            key={c.id}
            node={c}
            value={value}
            onToggle={onToggle}
            onToggleSubtree={onToggleSubtree}
          />
        ))}
    </>
  );
}
