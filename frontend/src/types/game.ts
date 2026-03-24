export type SessionStatus = 'waiting' | 'predicting' | 'locked' | 'resolved'

export interface GameSession {
  id: number
  title: string
  sport: string
  event_type: string
  status: SessionStatus
  prediction_window_ms: number
  stream_delay_ms: number
  created_at: string
  locked_at: string | null
  event_occurred_at: string | null
}

export interface Prediction {
  id: number
  session_id: number
  user_id: number
  predicted_at_ms: number
  client_offset_ms: number
  score: number | null
  delta_ms: number | null
  ai_commentary: string | null
  created_at: string
}

export interface LeaderboardEntry {
  rank: number
  user_id: number
  username: string
  total_score: number
  predictions_count: number
  best_delta_ms: number | null
  avg_score: number | null
}

export interface LeaderboardResponse {
  items: LeaderboardEntry[]
}

export interface CoachAdvice {
  session_id: number
  timing_profile: 'early' | 'late' | 'stable' | string
  summary: string
  tips: string[]
  avg_delta_ms: number | null
  recent_predictions: number
}

export interface MatchmakingPlayer {
  user_id: number
  username: string
  total_score: number
  predictions_count: number
  avg_score: number
  best_delta_ms: number | null
  skill_score: number
  risk_score: number
  consistency_score: number
}

export interface MatchmakingBucket {
  bucket: 'gold' | 'silver' | 'bronze' | string
  title: string
  players: MatchmakingPlayer[]
}

export interface MatchmakingPreview {
  session_id: number | null
  generated_at: string
  your_bucket: 'gold' | 'silver' | 'bronze' | string | null
  buckets: MatchmakingBucket[]
}

export interface LiveMatch {
  provider_match_id: number
  league: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  elapsed_minutes: number | null
  status_short: string | null
  started_at: string | null
}
