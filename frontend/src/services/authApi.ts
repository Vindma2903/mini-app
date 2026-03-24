import type { AuthCredentials, AuthUser, LoginResponse } from '../types/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = 'Request failed'
    try {
      const data = (await response.json()) as { detail?: string }
      if (data.detail) {
        message = data.detail
      }
    } catch {
      // Ignore JSON parse errors for non-JSON responses.
    }
    throw new Error(message)
  }

  return (await response.json()) as T
}

export async function loginWithCredentials(credentials: AuthCredentials): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  return request<AuthUser>('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function loginWithTelegram(): Promise<LoginResponse> {
  const initData = window.Telegram?.WebApp?.initData

  if (!initData) {
    throw new Error('Откройте приложение внутри Telegram')
  }

  return request<LoginResponse>('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ init_data: initData }),
  })
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function connectWalletMock(): Promise<void> {
  await delay(400)
}
