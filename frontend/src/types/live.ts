import type { LucideIcon } from 'lucide-react'

/** Точка лиги в шапке карточки (цвета из макета) */
export type LiveLeagueDotTone = 'blue' | 'orange' | 'red'

/** Маркер лиги: круг или киберспорт (crosshair) */
export type LiveLeagueMark = { type: 'dot'; tone: LiveLeagueDotTone } | { type: 'esports' }

export type LiveOddVariant = 'default' | 'accent' | 'muted' | 'positive'
export type LiveStatusTone = 'red' | 'yellow' | 'gray' | 'orange'

export interface LiveOddCell {
  label: string
  value: string
  /** `positive` — акцентный зелёный коэффициент (как в макете П1) */
  variant?: LiveOddVariant
}

export interface LiveMatchCardModel {
  id: string
  league: string
  leagueMark: LiveLeagueMark
  timer: string
  teamLeft: { name: string }
  teamRight: { name: string }
  score: string
  /** Подпись под счётом: тайм, карта и т.д. */
  meta: string
  /** Локальное время начала матча, если есть */
  startedAtLabel?: string
  statusBadge: {
    label: string
    tone: LiveStatusTone
  }
  odds?: [LiveOddCell, LiveOddCell, LiveOddCell]
}

export type LiveCategoryId = 'all' | 'football' | 'esports'

export interface LiveCategoryTabModel {
  id: LiveCategoryId
  label: string
  icon: LucideIcon
}
