import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      isAuthed: Boolean(s.user),
      isLoading: s.isBootstrapping,
      user: s.user,
      accessToken: s.accessToken,
      login: s.setSession,
      logout: s.logout,
    })),
  )
}
