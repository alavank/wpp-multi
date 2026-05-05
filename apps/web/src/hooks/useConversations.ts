import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";
import type { ConversationStatus } from "@wpp/shared";

export type ApiConversation = {
  id: string;
  departmentId: string;
  contactId: string;
  status: ConversationStatus;
  assignedAgentId: string | null;
  lastMessageAt: string | null;
  waitingSince: string | null;
  unreadCount: number;
  contact: {
    id: string;
    displayName: string | null;
    pushName: string | null;
    phoneE164: string;
    profilePicUrl: string | null;
  };
  assignedAgent: { id: string; fullName: string; photoUrl: string | null } | null;
};

export function useConversations(opts: {
  departmentId: string | null;
  status?: ConversationStatus;
  assignedToMe?: boolean;
}) {
  const { departmentId, status, assignedToMe } = opts;
  const [items, setItems] = useState<ApiConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!departmentId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ departmentId });
      if (status) params.set("status", status);
      if (assignedToMe) params.set("assignedToMe", "true");
      const data = await apiFetch<{ items: ApiConversation[] }>(
        `/conversations?${params.toString()}`,
      );
      setItems(data.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [departmentId, status, assignedToMe]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Realtime via Supabase: ouve mudanças em conversations do departamento.
  useEffect(() => {
    if (!departmentId) return;
    const channel = supabase
      .channel(`conversations:${departmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `department_id=eq.${departmentId}`,
        },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [departmentId, refetch]);

  return { items, loading, error, refetch };
}
