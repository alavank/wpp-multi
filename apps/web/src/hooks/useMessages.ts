import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";
import type { MessageDirection, MessageType } from "@wpp/shared";

export type ApiMessage = {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  type: MessageType;
  body: string | null;
  agentDisplayPrefix: string | null;
  sentAt: string;
  sender: { id: string; fullName: string; photoUrl: string | null } | null;
  media: unknown | null;
};

export function useMessages(conversationId: string | null) {
  const [items, setItems] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!conversationId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: ApiMessage[] }>(
        `/messages?conversationId=${conversationId}`,
      );
      setItems(data.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch]);

  async function sendText(body: string) {
    if (!conversationId) throw new Error("Sem conversa selecionada.");
    const saved = await apiFetch<ApiMessage>("/messages", {
      method: "POST",
      body: JSON.stringify({ conversationId, body }),
    });
    setItems((prev) => [...prev, saved]);
    return saved;
  }

  return { items, loading, error, refetch, sendText };
}
