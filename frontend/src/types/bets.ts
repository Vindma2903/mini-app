export type BetListTab = 'all' | 'active' | 'won' | 'lost'

/** Состояние исхода ставки */
export type BetOutcomeStatus = 'active' | 'won' | 'lost'

export type BetLeagueMark = { type: 'dot'; tone: 'blue' | 'red' } | { type: 'esports' }

export interface BetRecord {
  id: string
  leagueLine: string
  leagueMark: BetLeagueMark
  /** Плашка LIVE в шапке карточки */
  isLive?: boolean
  matchTitle: string
  marketLabel: string
  selection: string
  coefficient: string
  stakeFormatted: string
  stakeValue?: number
  currency: string
  outcome: BetOutcomeStatus
  sortTimestamp?: number
  liveStatusLabel?: string
  liveScoreLabel?: string
  liveTimerLabel?: string
  /** Подпись под лигой справа (опционально) */
  scheduleHint?: string
  /** Для завершённых: итог (+ выигрыш / − проигрыш) */
  settlementLabel?: string
  settlementAmount?: string
  /** Для активных: возможный выигрыш одной позиции */
  potentialWinFormatted?: string
  canCashOut?: boolean
  canCancel?: boolean
  canEditSelection?: boolean
}

export interface BetsTotals {
  totalStakeFormatted: string
  count: number
  potentialWinFormatted: string
  oddsHint: string
  currency: string
}
