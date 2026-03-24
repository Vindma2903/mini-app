import { createContext } from 'react'
import type { AuthUser } from '../types/auth'

export interface AuthContextValue {
  isAuthed: boolean
  isLoading: boolean
  user: AuthUser | null
  login: (token: string | null, user: AuthUser) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
