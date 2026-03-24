import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { LiveMatch } from '../types/game'
import type { WalletTransaction } from '../types/wallet'
import { useToastStore } from './toastStore'

export type BetSelection = 'home' | 'away' | 'draw'
export type BetStatus = 'open' | 'won' | 'lost'
export type BetResolveReason = 'match_result' | 'cashout' | 'cancelled'

export interface GameBet {
  id: string
  matchId: number
  league: string
  homeTeam: string
  awayTeam: string
  selection: BetSelection
  stake: number
  odds: number
  status: BetStatus
  placedAtIso: string
  resolvedAtIso?: string
  payout?: number
  resolveReason?: BetResolveReason
}

interface PlaceBetInput {
  match: LiveMatch
  selection: BetSelection
  stake: number
  odds: number
}

interface ActionResult {
  ok: boolean
  error?: string
}

interface GameWalletState {
  balance: number
  bets: GameBet[]
  transactions: WalletTransaction[]
  welcomeBonusClaimed: boolean
  placeBet: (input: PlaceBetInput) => ActionResult
  settleFromMatches: (matches: LiveMatch[]) => void
  cashOutBet: (betId: string) => ActionResult
  cancelBetWithFee: (betId: string) => ActionResult
  editBetSelection: (betId: string, selection: BetSelection) => ActionResult
  claimWelcomeBonus: (firstDepositAmount: number) => ActionResult
  addDemoFunds: (amount?: number) => void
  withdrawDemoFunds: (amount?: number) => ActionResult
}

const INITIAL_BALANCE = 12_550
const ALLOWED_ODDS = [0.5, 1, 1.8, 2.1]
const CASHOUT_MULTIPLIER = 0.7
const CANCEL_REFUND_MULTIPLIER = 0.9

function formatAmount(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value)
}

function nowDetailPrefix(): string {
  return `Сегодня, ${new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function getWinner(match: LiveMatch): BetSelection | null {
  if (match.home_score == null || match.away_score == null) return null
  if (match.home_score > match.away_score) return 'home'
  if (match.away_score > match.home_score) return 'away'
  return 'draw'
}

function selectionLabel(value: BetSelection): string {
  if (value === 'home') return 'Дом'
  if (value === 'away') return 'Гости'
  return 'Ничья'
}

export const useGameWalletStore = create<GameWalletState>()(
  persist(
    (set, get) => ({
      balance: INITIAL_BALANCE,
      bets: [],
      transactions: [],
      welcomeBonusClaimed: false,
      placeBet: ({ match, selection, stake, odds }) => {
        if (!Number.isFinite(stake) || stake <= 0) {
          return { ok: false, error: 'Введите корректную сумму ставки' }
        }
        if (stake < 100) {
          return { ok: false, error: 'Минимальная ставка — 100' }
        }
        if ((match.status_short ?? '').toUpperCase() === 'FT') {
          return { ok: false, error: 'Матч уже завершен' }
        }

        const state = get()
        if (state.balance < stake) {
          return { ok: false, error: 'Недостаточно средств на балансе' }
        }

        const hasOpenOnMatch = state.bets.some((bet) => bet.matchId === match.provider_match_id && bet.status === 'open')
        if (hasOpenOnMatch) {
          return { ok: false, error: 'На этот матч уже есть активная ставка' }
        }

        if (!ALLOWED_ODDS.includes(odds)) {
          return { ok: false, error: 'Недоступный коэффициент' }
        }

        const bet: GameBet = {
          id: makeId('bet'),
          matchId: match.provider_match_id,
          league: match.league,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          selection,
          stake,
          odds,
          status: 'open',
          placedAtIso: new Date().toISOString(),
        }

        const tx: WalletTransaction = {
          id: makeId('tx-bet'),
          title: 'Ставка',
          detail: `${nowDetailPrefix()} · ${match.home_team} — ${match.away_team}`,
          amountLabel: `-${formatAmount(stake)} ₽`,
          category: 'bet',
          status: 'completed',
        }

        set({
          balance: state.balance - stake,
          bets: [bet, ...state.bets],
          transactions: [tx, ...state.transactions].slice(0, 100),
        })
        useToastStore.getState().push({
          kind: 'success',
          title: 'Ставка принята',
          description: `${match.home_team} — ${match.away_team} · ${selectionLabel(selection)} x${odds}`,
          amountLabel: `-${formatAmount(stake)} ₽`,
        })

        return { ok: true }
      },
      settleFromMatches: (matches) => {
        const state = get()
        const byId = new Map<number, LiveMatch>(matches.map((m) => [m.provider_match_id, m]))
        let changed = false
        let newBalance = state.balance
        const newTx: WalletTransaction[] = []
        const justResolved: GameBet[] = []

        const updatedBets: GameBet[] = state.bets.map((bet): GameBet => {
          if (bet.status !== 'open') return bet
          const match = byId.get(bet.matchId)
          if (!match) return bet
          if ((match.status_short ?? '').toUpperCase() !== 'FT') return bet

          const winner = getWinner(match)
          if (winner == null) return bet

          changed = true
          const won = winner === bet.selection
          if (won) {
            const payout = Math.round(bet.stake * bet.odds)
            newBalance += payout
            newTx.push({
              id: makeId('tx-win'),
              title: 'Выигрыш',
              detail: `${nowDetailPrefix()} · ${bet.homeTeam} — ${bet.awayTeam}`,
              amountLabel: `+${formatAmount(payout)} ₽`,
              category: 'win',
              status: 'completed',
            })
            const resolvedWon: GameBet = {
              ...bet,
              status: 'won',
              payout,
              resolveReason: 'match_result',
              resolvedAtIso: new Date().toISOString(),
            }
            justResolved.push(resolvedWon)
            return resolvedWon
          }

          const resolvedLost: GameBet = {
            ...bet,
            status: 'lost',
            resolveReason: 'match_result',
            resolvedAtIso: new Date().toISOString(),
          }
          justResolved.push(resolvedLost)
          return resolvedLost
        })

        if (!changed) return

        set({
          balance: newBalance,
          bets: updatedBets,
          transactions: [...newTx, ...state.transactions].slice(0, 100),
        })
        for (const resolved of justResolved) {
          if (resolved.status === 'won') {
            useToastStore.getState().push({
              kind: 'success',
              title: 'Матч завершен',
              description: `${resolved.homeTeam} — ${resolved.awayTeam}`,
              amountLabel: `+${formatAmount(resolved.payout ?? 0)} ₽`,
            })
          } else if (resolved.status === 'lost') {
            useToastStore.getState().push({
              kind: 'error',
              title: 'Матч завершен',
              description: `Ставка проиграла: ${resolved.homeTeam} — ${resolved.awayTeam}`,
            })
          }
        }
      },
      cashOutBet: (betId) => {
        const state = get()
        const target = state.bets.find((bet) => bet.id === betId)
        if (!target || target.status !== 'open') {
          return { ok: false, error: 'Ставка недоступна для cash out' }
        }
        const payout = Math.round(target.stake * CASHOUT_MULTIPLIER)
        const updatedBets = state.bets.map((bet) =>
          bet.id === betId
            ? {
                ...bet,
                status: 'won' as const,
                payout,
                resolveReason: 'cashout' as const,
                resolvedAtIso: new Date().toISOString(),
              }
            : bet,
        )
        const tx: WalletTransaction = {
          id: makeId('tx-cashout'),
          title: 'Cash out',
          detail: `${nowDetailPrefix()} · ${target.homeTeam} — ${target.awayTeam}`,
          amountLabel: `+${formatAmount(payout)} ₽`,
          category: 'win',
          status: 'completed',
        }
        set({
          balance: state.balance + payout,
          bets: updatedBets,
          transactions: [tx, ...state.transactions].slice(0, 100),
        })
        useToastStore.getState().push({
          kind: 'success',
          title: 'Cash out выполнен',
          description: `${target.homeTeam} — ${target.awayTeam}`,
          amountLabel: `+${formatAmount(payout)} ₽`,
        })
        return { ok: true }
      },
      cancelBetWithFee: (betId) => {
        const state = get()
        const target = state.bets.find((bet) => bet.id === betId)
        if (!target || target.status !== 'open') {
          return { ok: false, error: 'Ставка недоступна для отмены' }
        }
        const refund = Math.round(target.stake * CANCEL_REFUND_MULTIPLIER)
        const updatedBets = state.bets.map((bet) =>
          bet.id === betId
            ? {
                ...bet,
                status: 'lost' as const,
                payout: refund,
                resolveReason: 'cancelled' as const,
                resolvedAtIso: new Date().toISOString(),
              }
            : bet,
        )
        const tx: WalletTransaction = {
          id: makeId('tx-cancel'),
          title: 'Отмена ставки',
          detail: `${nowDetailPrefix()} · Комиссия 10%`,
          amountLabel: `+${formatAmount(refund)} ₽`,
          category: 'win',
          status: 'completed',
        }
        set({
          balance: state.balance + refund,
          bets: updatedBets,
          transactions: [tx, ...state.transactions].slice(0, 100),
        })
        useToastStore.getState().push({
          kind: 'info',
          title: 'Ставка отменена',
          description: `Возврат 90% после комиссии`,
          amountLabel: `+${formatAmount(refund)} ₽`,
        })
        return { ok: true }
      },
      editBetSelection: (betId, selection) => {
        const state = get()
        const target = state.bets.find((bet) => bet.id === betId)
        if (!target || target.status !== 'open') {
          return { ok: false, error: 'Ставка недоступна для редактирования' }
        }
        if (target.selection === selection) {
          return { ok: false, error: 'Выбран тот же исход' }
        }
        set({
          bets: state.bets.map((bet) => (bet.id === betId ? { ...bet, selection } : bet)),
        })
        useToastStore.getState().push({
          kind: 'info',
          title: 'Исход обновлен',
          description: `Новый выбор: ${selectionLabel(selection)}`,
        })
        return { ok: true }
      },
      claimWelcomeBonus: (firstDepositAmount) => {
        const state = get()
        if (state.welcomeBonusClaimed) {
          return { ok: false, error: 'Бонус уже активирован' }
        }
        if (!Number.isFinite(firstDepositAmount) || firstDepositAmount <= 0) {
          return { ok: false, error: 'Введите корректную сумму первого депозита' }
        }
        const safe = Math.max(100, Math.floor(firstDepositAmount))
        const bonus = safe
        const total = safe + bonus

        const depositTx: WalletTransaction = {
          id: makeId('tx-welcome-deposit'),
          title: 'Первый депозит',
          detail: `${nowDetailPrefix()} · Welcome`,
          amountLabel: `+${formatAmount(safe)} ₽`,
          category: 'deposit',
          status: 'completed',
        }
        const bonusTx: WalletTransaction = {
          id: makeId('tx-welcome-bonus'),
          title: 'Бонус за вход +100%',
          detail: `${nowDetailPrefix()} · Welcome`,
          amountLabel: `+${formatAmount(bonus)} ₽`,
          category: 'deposit',
          status: 'completed',
        }

        set({
          balance: state.balance + total,
          welcomeBonusClaimed: true,
          transactions: [bonusTx, depositTx, ...state.transactions].slice(0, 100),
        })

        useToastStore.getState().push({
          kind: 'success',
          title: 'Бонус за вход активирован',
          description: `Первый депозит ${formatAmount(safe)} ₽ + бонус ${formatAmount(bonus)} ₽`,
          amountLabel: `+${formatAmount(total)} ₽`,
        })
        return { ok: true }
      },
      addDemoFunds: (amount = 1_000) => {
        const safe = Math.max(100, Math.floor(amount))
        const state = get()
        const tx: WalletTransaction = {
          id: makeId('tx-deposit'),
          title: 'Пополнение',
          detail: `${nowDetailPrefix()} · Demo`,
          amountLabel: `+${formatAmount(safe)} ₽`,
          category: 'deposit',
          status: 'completed',
        }
        set({
          balance: state.balance + safe,
          transactions: [tx, ...state.transactions].slice(0, 100),
        })
        useToastStore.getState().push({
          kind: 'success',
          title: 'Баланс пополнен',
          amountLabel: `+${formatAmount(safe)} ₽`,
        })
      },
      withdrawDemoFunds: (amount = 1_000) => {
        const safe = Math.max(100, Math.floor(amount))
        const state = get()
        if (state.balance < safe) {
          return { ok: false, error: 'Недостаточно средств для вывода' }
        }
        const tx: WalletTransaction = {
          id: makeId('tx-withdraw'),
          title: 'Вывод',
          detail: `${nowDetailPrefix()} · Demo`,
          amountLabel: `-${formatAmount(safe)} ₽`,
          category: 'withdrawal',
          status: 'completed',
        }
        set({
          balance: state.balance - safe,
          transactions: [tx, ...state.transactions].slice(0, 100),
        })
        useToastStore.getState().push({
          kind: 'info',
          title: 'Средства списаны',
          amountLabel: `-${formatAmount(safe)} ₽`,
        })
        return { ok: true }
      },
    }),
    {
      name: 'betneon-game-wallet',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        balance: state.balance,
        bets: state.bets,
        transactions: state.transactions,
        welcomeBonusClaimed: state.welcomeBonusClaimed,
      }),
    },
  ),
)
