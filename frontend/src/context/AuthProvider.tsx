import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from './authContext'
import { fetchCurrentUser } from '../services/authApi'
import type { AuthUser } from '../types/auth'

const TOKEN_STORAGE_KEY = 'betneon_auth_token'
const USER_STORAGE_KEY = 'betneon_auth_user'

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_STORAGE_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(() => Boolean(token))

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    let ignore = false

    const loadUser = async () => {
      try {
        const currentUser = await fetchCurrentUser(token)
        if (ignore) return
        setUser(currentUser)
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser))
      } catch {
        if (ignore) return
        sessionStorage.removeItem(TOKEN_STORAGE_KEY)
        sessionStorage.removeItem(USER_STORAGE_KEY)
        setToken(null)
        setUser(null)
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadUser()

    return () => {
      ignore = true
    }
  }, [token])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthed: Boolean(user),
      isLoading,
      user,
      login: (nextToken, nextUser) => {
        if (nextToken) {
          sessionStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
        } else {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY)
        }
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser))
        setToken(nextToken)
        setUser(nextUser)
        setIsLoading(false)
      },
      logout: () => {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY)
        sessionStorage.removeItem(USER_STORAGE_KEY)
        setToken(null)
        setUser(null)
        setIsLoading(false)
      },
    }),
    [isLoading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
