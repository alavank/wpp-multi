import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/apiClient";

/**
 * Department é qualquer nó da árvore organizacional (Organização, Secretaria,
 * Coordenação, Departamento, Setor, …). `kind` é texto livre. `parentId`
 * referencia outro nó (auto-relação). Apenas nós com `whatsappNumber`
 * recebem fila e podem ser conectados via QR.
 */
export type ApiDepartment = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  parentId: string | null;
  whatsappNumber: string | null;
  isActive: boolean;
};

export function useDepartments() {
  const [items, setItems] = useState<ApiDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: ApiDepartment[] }>("/departments");
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

  return { items, loading, error, refetch };
}
