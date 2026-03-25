import type { LiveMatch } from '../types/game'

const DEMO_MATCH_DURATION_MS = 2 * 60 * 1000
const baseNowMs = Date.now()

interface DemoSeed {
  provider_match_id: number
  league: string
  home_team: string
  away_team: string
  final_home_score: number
  final_away_score: number
  kickoff_offset_ms: number
}

const FOOTBALL_SEEDS: DemoSeed[] = [
  {
    provider_match_id: 910001,
    league: 'Premier League (Demo)',
    home_team: 'Arsenal',
    away_team: 'Chelsea',
    final_home_score: 2,
    final_away_score: 1,
    kickoff_offset_ms: 0,
  },
  {
    provider_match_id: 910002,
    league: 'La Liga (Demo)',
    home_team: 'Barcelona',
    away_team: 'Atletico',
    final_home_score: 1,
    final_away_score: 1,
    kickoff_offset_ms: 12_000,
  },
]

const ESPORT_SEEDS: DemoSeed[] = [
  {
    provider_match_id: 920001,
    league: 'ESL Challenger League (Demo)',
    home_team: 'Outfit 49',
    away_team: 'Team Aether',
    final_home_score: 13,
    final_away_score: 10,
    kickoff_offset_ms: 4_000,
  },
  {
    provider_match_id: 920002,
    league: 'BLAST Premier (Demo)',
    home_team: 'NaVi',
    away_team: 'G2',
    final_home_score: 12,
    final_away_score: 14,
    kickoff_offset_ms: 18_000,
  },
]

function toDemoMatch(seed: DemoSeed, nowMs: number): LiveMatch {
  const kickoffMs = baseNowMs + seed.kickoff_offset_ms
  const elapsedMs = Math.max(0, nowMs - kickoffMs)
  const progress = Math.min(1, elapsedMs / DEMO_MATCH_DURATION_MS)
  const statusShort = progress >= 1 ? 'FT' : '1H'
  const currentHome = Math.floor(seed.final_home_score * progress)
  const currentAway = Math.floor(seed.final_away_score * progress)
  const elapsedPseudoMinutes = progress >= 1 ? 90 : Math.max(1, Math.floor(progress * 90))

  return {
    provider_match_id: seed.provider_match_id,
    league: seed.league,
    home_team: seed.home_team,
    away_team: seed.away_team,
    home_score: progress >= 1 ? seed.final_home_score : currentHome,
    away_score: progress >= 1 ? seed.final_away_score : currentAway,
    elapsed_minutes: elapsedPseudoMinutes,
    status_short: statusShort,
    started_at: new Date(kickoffMs).toISOString(),
  }
}

export function getDemoFootballMatches(nowMs: number = Date.now()): LiveMatch[] {
  return FOOTBALL_SEEDS.map((seed) => toDemoMatch(seed, nowMs))
}

export function getDemoEsportMatches(nowMs: number = Date.now()): LiveMatch[] {
  return ESPORT_SEEDS.map((seed) => toDemoMatch(seed, nowMs))
}
