import { create } from "zustand";

type SelectionState = {
  departmentId: string | null;
  conversationId: string | null;
  setDepartment: (id: string | null) => void;
  selectConversation: (id: string | null) => void;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  departmentId: null,
  conversationId: null,
  setDepartment: (departmentId) => set({ departmentId, conversationId: null }),
  selectConversation: (conversationId) => set({ conversationId }),
}));
