import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthUser } from '../types/auth'

export interface AuthStoreState {
  accessToken: string | null
  user: AuthUser | null
  /** Пока проверяем JWT через GET /auth/me после загрузки из storage */
  isBootstrapping: boolean
  setSession: (accessToken: string | null, user: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser) => void
  setBootstrapping: (value: boolean) => void
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isBootstrapping: true,
      setSession: (accessToken, user) => set({ accessToken, user, isBootstrapping: false }),
      logout: () => set({ accessToken: null, user: null, isBootstrapping: false }),
      setUser: (user) => set({ user }),
      setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
    }),
    {
      name: 'betneon-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
)
