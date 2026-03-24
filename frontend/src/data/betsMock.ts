import type { BetRecord, BetsTotals } from '../types/bets'

export const MOCK_BETS: BetRecord[] = [
  {
    id: 'b1',
    leagueLine: 'Premier League · Сегодня, 22:00',
    leagueMark: { type: 'dot', tone: 'blue' },
    matchTitle: 'Manchester United — Arsenal',
    marketLabel: 'Исход матча',
    selection: 'Победа Manchester United',
    coefficient: '1.85',
    stakeFormatted: '500',
    currency: '₽',
    outcome: 'active',
    potentialWinFormatted: '925',
  },
  {
    id: 'b2',
    leagueLine: 'BLAST Premier · Сейчас Live',
    leagueMark: { type: 'esports' },
    isLive: true,
    matchTitle: 'NaVi — G2 Esports',
    marketLabel: 'Победитель карты',
    selection: 'Победа NaVi',
    coefficient: '1.42',
    stakeFormatted: '1 000',
    currency: '₽',
    outcome: 'active',
    potentialWinFormatted: '1 420',
  },
  {
    id: 'b3',
    leagueLine: 'La Liga · Вчера',
    leagueMark: { type: 'dot', tone: 'blue' },
    matchTitle: 'Barcelona — Sevilla',
    marketLabel: 'Тотал больше 2.5',
    selection: 'Больше 2.5',
    coefficient: '1.90',
    stakeFormatted: '300',
    currency: '₽',
    outcome: 'won',
    settlementLabel: 'Выплата',
    settlementAmount: '+570',
  },
  {
    id: 'b4',
    leagueLine: 'Serie A · 12 марта',
    leagueMark: { type: 'dot', tone: 'red' },
    matchTitle: 'Juventus — Milan',
    marketLabel: 'Исход матча',
    selection: 'Победа Milan',
    coefficient: '2.40',
    stakeFormatted: '400',
    currency: '₽',
    outcome: 'lost',
    settlementLabel: 'Убыток',
    settlementAmount: '−400',
  },
]

export const MOCK_ACTIVE_TOTALS: BetsTotals = {
  totalStakeFormatted: '1 500',
  count: 2,
  potentialWinFormatted: '2 345',
  oddsHint: 'При коэфф. 1.85 и 1.42',
  currency: '₽',
}

export function filterBetsByTab(bets: BetRecord[], tab: 'active' | 'completed'): BetRecord[] {
  if (tab === 'active') {
    return bets.filter((b) => b.outcome === 'active')
  }
  return bets.filter((b) => b.outcome === 'won' || b.outcome === 'lost')
}
