import { Circle, Flame, Gamepad2 } from 'lucide-react'
import type { LiveCategoryTabModel, LiveMatchCardModel } from '../types/live'

export const LIVE_CATEGORY_TABS: LiveCategoryTabModel[] = [
  { id: 'all', label: 'Все', icon: Flame },
  { id: 'football', label: 'Футбол', icon: Circle },
  { id: 'esports', label: 'Кибер', icon: Gamepad2 },
]

export const LIVE_MATCHES_MOCK: LiveMatchCardModel[] = [
  {
    id: 'pl-1',
    league: 'Premier League',
    leagueMark: { type: 'dot', tone: 'blue' },
    timer: "72'",
    teamLeft: { name: 'Arsenal' },
    teamRight: { name: 'Chelsea' },
    score: '2 : 1',
    meta: '2-й тайм',
    odds: [
      { label: 'П1', value: '1.65', variant: 'positive' },
      { label: 'Ничья', value: '4.20', variant: 'accent' },
      { label: 'П2', value: '3.80' },
    ],
  },
  {
    id: 'cs-1',
    league: 'BLAST Premier',
    leagueMark: { type: 'esports' },
    timer: 'Раунд 18',
    teamLeft: { name: 'NaVi' },
    teamRight: { name: 'G2' },
    score: '11 : 7',
    meta: 'Карта 2 / Mirage',
    odds: [
      { label: 'П1', value: '1.35', variant: 'positive' },
      { label: 'Ничья', value: '—', variant: 'muted' },
      { label: 'П2', value: '2.95' },
    ],
  },
  {
    id: 'lla-1',
    league: 'La Liga',
    leagueMark: { type: 'dot', tone: 'orange' },
    timer: "34'",
    teamLeft: { name: 'Barcelona' },
    teamRight: { name: 'Atletico' },
    score: '0 : 0',
    meta: '1-й тайм',
    odds: [
      { label: 'П1', value: '2.10' },
      { label: 'Ничья', value: '3.25' },
      { label: 'П2', value: '3.40' },
    ],
  },
]
