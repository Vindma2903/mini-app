export type BetListTab = 'active' | 'completed'

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
  currency: string
  outcome: BetOutcomeStatus
  /** Подпись под лигой справа (опционально) */
  scheduleHint?: string
  /** Для завершённых: итог (+ выигрыш / − проигрыш) */
  settlementLabel?: string
  settlementAmount?: string
  /** Для активных: возможный выигрыш одной позиции */
  potentialWinFormatted?: string
}

export interface BetsTotals {
  totalStakeFormatted: string
  count: number
  potentialWinFormatted: string
  oddsHint: string
  currency: string
}
