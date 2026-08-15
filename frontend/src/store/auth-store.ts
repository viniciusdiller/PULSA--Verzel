import { create } from "zustand";
import {
  clearSession,
  getStoredUser,
  saveSession,
  updateStoredUser,
  type AuthUser,
} from "@/lib/auth";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isHydrated: boolean;
  hydrate: () => void;
  login: (accessToken: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

// Store global (não por-componente) para que login/logout feitos em QUALQUER
// tela — ex. o formulário de login — reflitam na hora em componentes que já
// estavam montados antes disso, como o SiteHeader no layout raiz. Antes,
// cada `useAuth()` tinha seu próprio `useState` lido do localStorage só no
// mount; como o header nunca remonta entre navegações client-side, ele
// ficava com sessão "null" até um reload de página inteira.
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isHydrated: false,
  hydrate: () => {
    if (get().isHydrated) return;
    set({ user: getStoredUser(), isLoading: false, isHydrated: true });
  },
  login: (accessToken, user) => {
    saveSession(accessToken, user);
    set({ user, isLoading: false, isHydrated: true });
  },
  updateUser: (user) => {
    updateStoredUser(user);
    set({ user });
  },
  logout: () => {
    clearSession();
    set({ user: null, isLoading: false, isHydrated: true });
  },
}));
