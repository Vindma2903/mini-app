import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { fetchCurrentUser } from '../services/authApi'
import { useAuthStore } from '../stores/authStore'

/**
 * После rehydrate Zustand проверяет JWT и подтягивает профиль.
 * Pinia в Vue делает то же через persist + onMounted.
 */
export function AuthStateProvider({ children }: { children: ReactNode }): ReactElement {
  const [storageReady, setStorageReady] = useState(() => useAuthStore.persist.hasHydrated())

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setStorageReady(true))
    if (useAuthStore.persist.hasHydrated()) {
      setStorageReady(true)
    }
    return unsub
  }, [])

  useEffect(() => {
    if (!storageReady) return

    let cancelled = false
    const { accessToken, setUser, logout, setBootstrapping } = useAuthStore.getState()

    if (!accessToken) {
      setBootstrapping(false)
      return
    }

    void (async () => {
      try {
        const profile = await fetchCurrentUser(accessToken)
        if (!cancelled) {
          setUser(profile)
        }
      } catch {
        if (!cancelled) {
          logout()
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [storageReady])

  return <>{children}</>
}
