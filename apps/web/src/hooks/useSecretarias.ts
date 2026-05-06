import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/apiClient";

export type ApiSecretaria = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: { departments: number; users: number };
};

export function useSecretarias() {
  const [items, setItems] = useState<ApiSecretaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: ApiSecretaria[] }>("/secretarias");
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
