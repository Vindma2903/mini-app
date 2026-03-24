export interface SportTab {
  id: string
  label: string
  icon: 'trophy' | 'gamepad-2'
}

export interface CategoryItem {
  id: string
  label: string
  icon: 'circle' | 'crosshair' | 'sword' | 'shield'
  iconColor: string
}

export interface OddsOption {
  label: string
  value: string
  variant?: 'default' | 'accent'
}

export interface MatchCardData {
  id: string
  matchId?: number
  league: string
  leagueIcon: 'circle' | 'crosshair'
  leagueIconColor: string
  teamLeft: { name: string }
  teamRight: { name: string }
  vsMeta: string
  odds: OddsOption[]
}

export interface LiveMatchData {
  id: string
  liveLabel: string
  timer: string
  teamLeft: { name: string }
  teamRight: { name: string }
  score: string
  odds: { value: string; tone: 'green' | 'amber' | 'white' }[]
}
