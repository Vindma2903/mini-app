import type { LeaderboardEntry } from '../types/game'
import type { AuthUser } from '../types/auth'

function meName(user: AuthUser | null): string {
  if (!user) return 'Вы'
  return user.display_name || user.username || user.email.split('@', 1)[0] || 'Вы'
}

export function buildDemoLeaderboard(user: AuthUser | null): LeaderboardEntry[] {
  const meId = user?.id ?? 999001
  const me = meName(user)
  return [
    {
      rank: 1,
      user_id: 1021,
      username: 'Vortex',
      total_score: 958,
      predictions_count: 7,
      best_delta_ms: 420,
      avg_score: 812.4,
    },
    {
      rank: 2,
      user_id: meId,
      username: me,
      total_score: 914,
      predictions_count: 6,
      best_delta_ms: 510,
      avg_score: 776.8,
    },
    {
      rank: 3,
      user_id: 1037,
      username: 'NightFox',
      total_score: 873,
      predictions_count: 8,
      best_delta_ms: 690,
      avg_score: 711.2,
    },
    {
      rank: 4,
      user_id: 1044,
      username: 'Sirius',
      total_score: 812,
      predictions_count: 5,
      best_delta_ms: 910,
      avg_score: 684.0,
    },
    {
      rank: 5,
      user_id: 1092,
      username: 'Kite',
      total_score: 761,
      predictions_count: 6,
      best_delta_ms: 1010,
      avg_score: 633.1,
    },
  ]
}
