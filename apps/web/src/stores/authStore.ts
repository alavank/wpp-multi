import { create } from "zustand";
import type { Role } from "@wpp/shared";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  photoUrl?: string;
  role: Role;
};

type AuthState = {
  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
