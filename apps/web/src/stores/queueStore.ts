import { create } from "zustand";
import type { ConversationStatus } from "@wpp/shared";

export type ConversationListItem = {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactPhotoUrl?: string;
  status: ConversationStatus;
  assignedAgentId?: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount: number;
  waitingSince?: string;
};

export type QueueTabKey =
  | "WAITING"
  | "IN_PROGRESS"
  | "FINISHED"
  | "TRANSFERS_SENT"
  | "TRANSFERS_RECEIVED";

type QueueState = {
  activeTab: QueueTabKey;
  conversations: Record<string, ConversationListItem>;
  setActiveTab: (tab: QueueTabKey) => void;
  upsertConversation: (c: ConversationListItem) => void;
  removeConversation: (id: string) => void;
  /** Lista derivada para a aba ativa, já ordenada FIFO em WAITING. */
  listFor: (tab: QueueTabKey, currentUserId?: string) => ConversationListItem[];
};

export const useQueueStore = create<QueueState>((set, get) => ({
  activeTab: "WAITING",
  conversations: {},
  setActiveTab: (activeTab) => set({ activeTab }),
  upsertConversation: (c) =>
    set((s) => ({ conversations: { ...s.conversations, [c.id]: c } })),
  removeConversation: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.conversations;
      return { conversations: rest };
    }),
  listFor: (tab, currentUserId) => {
    const all = Object.values(get().conversations);
    switch (tab) {
      case "WAITING":
        return all
          .filter((c) => c.status === "WAITING")
          .sort((a, b) => (a.waitingSince ?? "").localeCompare(b.waitingSince ?? ""));
      case "IN_PROGRESS":
        return all
          .filter((c) => c.status === "IN_PROGRESS" && c.assignedAgentId === currentUserId)
          .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
      case "FINISHED":
        return all
          .filter((c) => c.status === "FINISHED")
          .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
      // Transferências são consultadas via tabela Transfer no backend; este store
      // apenas mantém a aba selecionada — listas reais virão de hooks dedicados.
      case "TRANSFERS_SENT":
      case "TRANSFERS_RECEIVED":
        return [];
    }
  },
}));
