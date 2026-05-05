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
  mediaId: string | null;
  sentAt: string;
  sender: { id: string; fullName: string; photoUrl: string | null } | null;
  media: {
    id: string;
    mimeType: string;
    sizeBytes: number;
    durationMs: number | null;
    width: number | null;
    height: number | null;
  } | null;
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

  async function sendMedia(
    file: File,
    type: "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "INSTANT_VIDEO",
    caption?: string,
  ) {
    if (!conversationId) throw new Error("Sem conversa selecionada.");
    const bucket = bucketForType(type);
    const buffer = await file.arrayBuffer();

    // Upload binário cru.
    const { id: mediaId } = await apiFetch<{ id: string }>(
      `/media?bucket=${bucket}&mime=${encodeURIComponent(file.type || "application/octet-stream")}`,
      { method: "PUT", body: new Blob([buffer]), headers: {} },
    );

    const saved = await apiFetch<ApiMessage>("/messages/media", {
      method: "POST",
      body: JSON.stringify({ conversationId, type, mediaId, caption }),
    });
    setItems((prev) => [...prev, saved]);
    return saved;
  }

  return { items, loading, error, refetch, sendText, sendMedia };
}

function bucketForType(type: string): string {
  switch (type) {
    case "IMAGE":
      return "image";
    case "AUDIO":
      return "audio";
    case "VIDEO":
      return "video";
    case "INSTANT_VIDEO":
      return "instant_video";
    case "DOCUMENT":
    default:
      return "document";
  }
}
