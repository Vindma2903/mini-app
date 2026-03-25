import { useAuthStore } from '../stores/authStore'
import { useApiRequestQueueStore } from '../stores/apiRequestQueueStore'
import type {
  CoachAdvice,
  GameSession,
  LeaderboardResponse,
  LiveMatch,
  MatchmakingPreview,
  Prediction,
} from '../types/game'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://megablank.ru/api/v1'
const RETRY_DELAYS_MS = [5000, 30000, 60000] as const

function getToken(): string {
  const token = useAuthStore.getState().accessToken
  if (!token) {
    throw new Error('Для игры нужен вход через Telegram или email')
  }
  return token
}

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const method = (init?.method ?? 'GET').toUpperCase()
  const url = `${API_BASE_URL}${path}`
  const requestId = useApiRequestQueueStore.getState().enqueue({ method, url })
  let lastError: Error | null = null

  for (let attemptIndex = 0; attemptIndex <= RETRY_DELAYS_MS.length; attemptIndex += 1) {
    if (attemptIndex > 0) {
      useApiRequestQueueStore.getState().markAttemptStart(requestId, attemptIndex + 1)
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {}),
        },
      })

      if (!response.ok) {
        let message = 'Request failed'
        try {
          const body = (await response.json()) as { detail?: unknown }
          if (typeof body.detail === 'string') {
            message = body.detail
          } else if (Array.isArray(body.detail)) {
            const parts = body.detail.map((item) => {
              if (item && typeof item === 'object' && 'msg' in item) {
                return String((item as { msg: unknown }).msg)
              }
              return typeof item === 'string' ? item : JSON.stringify(item)
            })
            message = parts.join('; ')
          }
        } catch {
          // Ignore JSON parse errors.
        }
        throw new Error(message)
      }

      useApiRequestQueueStore.getState().markSuccess(requestId)
      return (await response.json()) as T
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error'
      lastError = error instanceof Error ? error : new Error(message)
      if (attemptIndex < RETRY_DELAYS_MS.length) {
        const retryInSeconds = Math.round(RETRY_DELAYS_MS[attemptIndex] / 1000)
        useApiRequestQueueStore
          .getState()
          .markRetry(requestId, retryInSeconds, attemptIndex + 2, `${message}. Повтор через ${retryInSeconds}с`)
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attemptIndex]))
        continue
      }
      useApiRequestQueueStore.getState().markError(requestId, message)
      throw lastError
    }
  }
  useApiRequestQueueStore.getState().markError(requestId, lastError?.message ?? 'Request failed')
  throw lastError ?? new Error('Request failed')
}

export async function getActiveSession(): Promise<GameSession | null> {
  return authedRequest<GameSession | null>('/sessions/active')
}

export async function getMyPrediction(sessionId: number): Promise<Prediction | null> {
  return authedRequest<Prediction | null>(`/predictions/me/${sessionId}`)
}

export async function createPrediction(sessionId: number): Promise<Prediction> {
  return authedRequest<Prediction>('/predictions', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      client_timestamp_ms: Date.now(),
      stream_delay_compensation_ms: 0,
    }),
  })
}

export async function cancelMyPrediction(sessionId: number): Promise<void> {
  await authedRequest<{ ok: boolean }>(`/predictions/me/${sessionId}`, { method: 'DELETE' })
}

export async function getSessionLeaderboard(sessionId: number): Promise<LeaderboardResponse> {
  return authedRequest<LeaderboardResponse>(`/leaderboard/session/${sessionId}`)
}

export async function getDailyLeaderboard(): Promise<LeaderboardResponse> {
  return authedRequest<LeaderboardResponse>('/leaderboard/daily')
}

export async function getGlobalLeaderboard(): Promise<LeaderboardResponse> {
  return authedRequest<LeaderboardResponse>('/leaderboard/global')
}

export async function getCoachAdvice(sessionId?: number): Promise<CoachAdvice> {
  const suffix = typeof sessionId === 'number' ? `?session_id=${sessionId}` : ''
  return authedRequest<CoachAdvice>(`/ai/coach/me${suffix}`)
}

export async function getMatchmakingPreview(sessionId?: number): Promise<MatchmakingPreview> {
  const suffix = typeof sessionId === 'number' ? `?session_id=${sessionId}` : ''
  return authedRequest<MatchmakingPreview>(`/tournaments/matchmaking-preview${suffix}`)
}

export async function getPopularMatches(): Promise<LiveMatch[]> {
  return authedRequest<LiveMatch[]>('/matches/popular')
}

export async function getEsportsMatches(): Promise<LiveMatch[]> {
  return authedRequest<LiveMatch[]>('/matches/esports')
}

export async function getLiveMatches(): Promise<LiveMatch[]> {
  return authedRequest<LiveMatch[]>('/matches/live')
}
