import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  devLogin: () => void;
}

// Development user for quick testing
const DEV_USER: User = {
  id: 'dev-user-001',
  email: 'dev@example.com',
  displayName: 'Dev User',
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      // Development mode: auto-login without backend
      devLogin: () =>
        set({
          user: DEV_USER,
          accessToken: 'dev-token-123',
          refreshToken: 'dev-refresh-123',
          isAuthenticated: true,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Auto dev-login in development mode
if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
  const state = useAuthStore.getState();
  if (!state.isAuthenticated) {
    console.log('[Dev] Auto-logging in as dev user');
    state.devLogin();
  }
}
