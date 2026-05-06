import type { ApiDepartment } from "../hooks/useDepartments";

export type OrgNode = ApiDepartment & {
  depth: number;
  children: OrgNode[];
};

/** Constrói uma floresta a partir da lista flat. Cada raiz aparece com depth=0. */
export function buildTree(items: ApiDepartment[]): OrgNode[] {
  const map = new Map<string, OrgNode>();
  for (const it of items) {
    map.set(it.id, { ...it, depth: 0, children: [] });
  }
  const roots: OrgNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // ordena alfabeticamente em cada nível
  const sortRec = (arr: OrgNode[], depth: number) => {
    arr.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    arr.forEach((n) => {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    });
  };
  sortRec(roots, 0);
  return roots;
}

/** Devolve [node, ...descendants] em ordem de profundidade. */
export function flattenSubtree(node: OrgNode): OrgNode[] {
  const out: OrgNode[] = [node];
  for (const c of node.children) out.push(...flattenSubtree(c));
  return out;
}
