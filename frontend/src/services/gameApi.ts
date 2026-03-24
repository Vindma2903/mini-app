import { useAuthStore } from '../stores/authStore'
import type {
  CoachAdvice,
  GameSession,
  LeaderboardResponse,
  LiveMatch,
  MatchmakingPreview,
  Prediction,
} from '../types/game'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

function getToken(): string {
  const token = useAuthStore.getState().accessToken
  if (!token) {
    throw new Error('Для игры нужен вход через Telegram или email')
  }
  return token
}

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
      }
    } catch {
      // Ignore JSON parse errors.
    }
    throw new Error(message)
  }

  return (await response.json()) as T
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

export async function getSessionLeaderboard(sessionId: number): Promise<LeaderboardResponse> {
  return authedRequest<LeaderboardResponse>(`/leaderboard/${sessionId}`)
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

export async function getLiveMatches(): Promise<LiveMatch[]> {
  return authedRequest<LiveMatch[]>('/matches/live')
}
