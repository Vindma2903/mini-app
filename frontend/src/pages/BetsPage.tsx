import { useCallback, useEffect, useMemo, useState } from 'react'
import { BetCard } from '../components/bets/BetCard'
import { BetsFilterTabs } from '../components/bets/BetsFilterTabs'
import { BetsPageHeader } from '../components/bets/BetsPageHeader'
import { StatusBar } from '../components/StatusBar'
import { cancelMyPrediction, getActiveSession, getLiveMatches, getMyPrediction } from '../services/gameApi'
import { useGameWalletStore } from '../stores/gameWalletStore'
import { useToastStore } from '../stores/toastStore'
import type { GameBet } from '../stores/gameWalletStore'
import type { BetListTab, BetRecord } from '../types/bets'
import type { GameSession, LiveMatch, Prediction } from '../types/game'

function toBetRecord(session: GameSession, prediction: Prediction, stake: number): BetRecord {
  const score = prediction.score ?? 0
  const outcome = prediction.score == null ? 'active' : score > 0 ? 'won' : 'lost'

  return {
    id: `prediction-${prediction.id}`,
    leagueLine: `${session.sport.toUpperCase()} • ${session.event_type}`,
    leagueMark: session.sport.includes('football') ? { type: 'dot', tone: 'blue' } : { type: 'esports' },
    isLive: session.status === 'predicting' || session.status === 'locked',
    matchTitle: session.title,
    marketLabel: 'Мой прогноз',
    selection: `Время клика: ${new Date(prediction.predicted_at_ms).toLocaleTimeString()}`,
    coefficient: prediction.delta_ms != null ? `${prediction.delta_ms}мс` : '—',
    stakeFormatted: new Intl.NumberFormat('ru-RU').format(stake),
    stakeValue: stake,
    currency: '₽',
    outcome,
    sortTimestamp: new Date(prediction.created_at).getTime(),
    scheduleHint: session.status,
    canCancel: outcome === 'active' && (session.status === 'predicting' || session.status === 'locked'),
    cancelButtonLabel: 'Отменить',
  }
}

function selectionLabel(value: GameBet['selection']): string {
  if (value === 'home') return 'Дом'
  if (value === 'away') return 'Гости'
  return 'Ничья'
}

function getLiveStatus(match: LiveMatch | undefined): string | undefined {
  if (!match) return undefined
  const status = (match.status_short ?? 'LIVE').toUpperCase()
  if (status === 'HT') return 'HT'
  if (status === 'FT') return 'FT'
  return 'LIVE'
}

function getLiveTimer(match: LiveMatch | undefined): string | undefined {
  if (!match) return undefined
  if (match.elapsed_minutes != null) return `${match.elapsed_minutes}'`
  return match.status_short ?? undefined
}

function toGameBetRecord(bet: GameBet, liveMatch: LiveMatch | undefined): BetRecord {
  const outcome = bet.status === 'open' ? 'active' : bet.status
  const potentialWin = Math.round(bet.stake * bet.odds)
  const isFinished = (liveMatch?.status_short ?? '').toUpperCase() === 'FT'
  const isOpen = bet.status === 'open'
  const settleLabel =
    bet.resolveReason === 'cashout'
      ? 'Досрочный вывод +'
      : bet.resolveReason === 'cancelled'
        ? 'Возврат +'
        : outcome === 'won'
          ? '+'
          : '-'

  return {
    id: `wallet-${bet.id}`,
    leagueLine: `${bet.league} • Игровая ставка`,
    leagueMark: { type: 'dot', tone: 'blue' },
    isLive: isOpen,
    matchTitle: `${bet.homeTeam} — ${bet.awayTeam}`,
    marketLabel: 'Исход матча',
    selection: selectionLabel(bet.selection),
    coefficient: `x${bet.odds}`,
    stakeFormatted: new Intl.NumberFormat('ru-RU').format(bet.stake),
    stakeValue: bet.stake,
    currency: '₽',
    outcome,
    sortTimestamp: new Date(bet.resolvedAtIso ?? bet.placedAtIso).getTime(),
    scheduleHint: isOpen ? (liveMatch?.status_short ?? 'LIVE') : 'FT',
    liveStatusLabel: getLiveStatus(liveMatch),
    liveScoreLabel: liveMatch ? `${liveMatch.home_score ?? '—'} : ${liveMatch.away_score ?? '—'}` : undefined,
    liveTimerLabel: getLiveTimer(liveMatch),
    settlementLabel: bet.status === 'open' ? undefined : settleLabel,
    settlementAmount:
      bet.status === 'open' ? undefined : new Intl.NumberFormat('ru-RU').format(bet.payout ?? 0),
    potentialWinFormatted: isOpen ? new Intl.NumberFormat('ru-RU').format(potentialWin) : undefined,
    canCashOut: isOpen && !isFinished,
    canCancel: isOpen && !isFinished,
    canEditSelection: isOpen && !isFinished,
  }
}

export function BetsPage(): JSX.Element {
  const [tab, setTab] = useState<BetListTab>('all')
  const [session, setSession] = useState<GameSession | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [pendingPredictionCancelId, setPendingPredictionCancelId] = useState<string | null>(null)
  const [pendingPredictionCancelSessionId, setPendingPredictionCancelSessionId] = useState<number | null>(null)
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const gameWalletBets = useGameWalletStore((s) => s.bets)
  const predictionStakesBySession = useGameWalletStore((s) => s.predictionStakesBySession)
  const clearPredictionStake = useGameWalletStore((s) => s.clearPredictionStake)
  const settleFromMatches = useGameWalletStore((s) => s.settleFromMatches)
  const cashOutBet = useGameWalletStore((s) => s.cashOutBet)
  const cancelBetWithFee = useGameWalletStore((s) => s.cancelBetWithFee)
  const editBetSelection = useGameWalletStore((s) => s.editBetSelection)
  const pushToast = useToastStore((s) => s.push)

  const loadData = useCallback(async () => {
    try {
      const active = await getActiveSession()
      setSession(active)
      if (!active) {
        setPrediction(null)
        setError(null)
        return
      }
      const myPrediction = await getMyPrediction(active.id)
      setPrediction(myPrediction)
      const live = await getLiveMatches()
      setLiveMatches(live)
      settleFromMatches(live)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить ставки')
    } finally {
      setLoading(false)
    }
  }, [settleFromMatches])

  useEffect(() => {
    void loadData()
    const intervalId = window.setInterval(() => {
      void loadData()
    }, 3000)
    return () => window.clearInterval(intervalId)
  }, [loadData])

  const bets = useMemo<BetRecord[]>(() => {
    const liveById = new Map(liveMatches.map((item) => [item.provider_match_id, item]))
    const wallet = gameWalletBets.map((bet) => toGameBetRecord(bet, liveById.get(bet.matchId)))
    const predictionStake = session ? predictionStakesBySession[session.id] ?? 100 : 100
    const predictionBet = session && prediction ? [toBetRecord(session, prediction, predictionStake)] : []
    return [...wallet, ...predictionBet]
  }, [gameWalletBets, liveMatches, prediction, predictionStakesBySession, session])

  const visible = useMemo(() => {
    return tab === 'all'
      ? bets
      : tab === 'active'
        ? bets.filter((item) => item.outcome === 'active')
        : tab === 'won'
          ? bets.filter((item) => item.outcome === 'won')
          : bets.filter((item) => item.outcome === 'lost')
  }, [bets, tab])

  const stats = useMemo(() => {
    const walletResolved = gameWalletBets.filter((bet) => bet.status !== 'open')
    const walletWon = walletResolved.filter((bet) => bet.status === 'won')
    const totalResolved = walletResolved.length
    const winRate = totalResolved === 0 ? 0 : (walletWon.length / totalResolved) * 100
    const totalStake = gameWalletBets.reduce((acc, bet) => acc + bet.stake, 0)
    const totalPayout = gameWalletBets.reduce((acc, bet) => acc + (bet.payout ?? 0), 0)
    const pl = totalPayout - totalStake
    const roi = totalStake === 0 ? 0 : (pl / totalStake) * 100

    const byDateDesc = [...walletResolved].sort(
      (a, b) => new Date(b.resolvedAtIso ?? b.placedAtIso).getTime() - new Date(a.resolvedAtIso ?? a.placedAtIso).getTime(),
    )
    let streakType: 'win' | 'lose' | null = null
    let streak = 0
    for (const bet of byDateDesc) {
      const currentType: 'win' | 'lose' = bet.status === 'won' ? 'win' : 'lose'
      if (!streakType) {
        streakType = currentType
        streak = 1
        continue
      }
      if (currentType === streakType) {
        streak += 1
      } else {
        break
      }
    }

    return {
      winRateLabel: `${winRate.toFixed(1)}%`,
      roiLabel: `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`,
      plLabel: `${pl >= 0 ? '+' : ''}${new Intl.NumberFormat('ru-RU').format(pl)} ₽`,
      streakLabel: streakType ? `${streakType === 'win' ? 'W' : 'L'}${streak}` : '—',
    }
  }, [gameWalletBets])

  const onCashOut = useCallback(
    (betId: string) => {
      const localId = betId.replace('wallet-', '')
      const result = cashOutBet(localId)
      if (!result.ok) {
        setError(result.error ?? 'Не удалось выполнить cash out')
      } else {
        setError(null)
      }
    },
    [cashOutBet],
  )

  const onCancelBet = useCallback(
    (betId: string) => {
      if (betId.startsWith('prediction-')) {
        setPendingPredictionCancelId(betId)
        setPendingPredictionCancelSessionId(prediction?.session_id ?? null)
        return
      }
      const localId = betId.replace('wallet-', '')
      const result = cancelBetWithFee(localId)
      if (!result.ok) {
        setError(result.error ?? 'Не удалось отменить ставку')
      } else {
        setError(null)
      }
    },
    [cancelBetWithFee, prediction?.session_id],
  )

  const onConfirmCancelPrediction = useCallback(async () => {
    if (!pendingPredictionCancelId) return
    if (!pendingPredictionCancelSessionId) {
      setError('Сессия не найдена')
      setPendingPredictionCancelId(null)
      setPendingPredictionCancelSessionId(null)
      return
    }
    try {
      await cancelMyPrediction(pendingPredictionCancelSessionId)
      clearPredictionStake(pendingPredictionCancelSessionId)
      setPrediction(null)
      setError(null)
      pushToast({
        kind: 'info',
        title: 'Прогноз отменен',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отменить прогноз')
    } finally {
      setPendingPredictionCancelId(null)
      setPendingPredictionCancelSessionId(null)
    }
  }, [clearPredictionStake, pendingPredictionCancelId, pendingPredictionCancelSessionId, pushToast])

  const onEditSelection = useCallback(
    (betId: string, selection: GameBet['selection']) => {
      const localId = betId.replace('wallet-', '')
      const result = editBetSelection(localId, selection)
      if (!result.ok) {
        setError(result.error ?? 'Не удалось изменить исход')
      } else {
        setError(null)
      }
    },
    [editBetSelection],
  )

  return (
    <>
      <StatusBar />
      <BetsPageHeader tab={tab} count={visible.length} />
      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
        <BetsFilterTabs active={tab} onChange={setTab} />
        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#141829] p-3">
            <p className="text-[10px] text-[#8b95b0]">Win rate</p>
            <p className="text-sm font-semibold text-white">{stats.winRateLabel}</p>
          </div>
          <div className="rounded-xl bg-[#141829] p-3">
            <p className="text-[10px] text-[#8b95b0]">ROI</p>
            <p className="text-sm font-semibold text-white">{stats.roiLabel}</p>
          </div>
          <div className="rounded-xl bg-[#141829] p-3">
            <p className="text-[10px] text-[#8b95b0]">Серия</p>
            <p className="text-sm font-semibold text-white">{stats.streakLabel}</p>
          </div>
          <div className="rounded-xl bg-[#141829] p-3">
            <p className="text-[10px] text-[#8b95b0]">Общий P/L</p>
            <p className="text-sm font-semibold text-white">{stats.plLabel}</p>
          </div>
        </section>
        <section className="flex flex-col gap-2.5" aria-label="Список ставок">
          {loading ? <p className="py-8 text-center text-sm text-[#8b95b0]">Загрузка...</p> : null}
          {!loading && error ? <p className="py-8 text-center text-sm text-red-400">{error}</p> : null}
          {!loading && !error && visible.length === 0 ? (
            <p className="py-8 text-center font-[family-name:var(--font-inter)] text-sm text-[#8b95b0]">
              {tab === 'active'
                ? 'Нет активных прогнозов. Сделайте прогноз на главном экране.'
                : 'Нет ставок по выбранному фильтру'}
            </p>
          ) : null}
          {visible.map((bet) => (
            <BetCard
              key={bet.id}
              bet={bet}
              onCashOut={onCashOut}
              onCancel={onCancelBet}
              onEditSelection={onEditSelection}
            />
          ))}
        </section>

      </main>
      {pendingPredictionCancelId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#02040bcc]/80 p-4">
          <div className="w-full max-w-[393px] rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#2a2f48]">
            <h3 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">Точно отменить?</h3>
            <p className="mt-1 text-xs text-[#8b95b0]">
              Прогноз будет удален со страницы ставок. Действие нельзя отменить.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingPredictionCancelId(null)
                  setPendingPredictionCancelSessionId(null)
                }}
                className="h-10 rounded-lg bg-[#0f1322] text-sm font-medium text-[#8b95b0]"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => {
                  void onConfirmCancelPrediction()
                }}
                className="h-10 rounded-lg bg-[#ef4444]/20 text-sm font-semibold text-[#ef4444]"
              >
                Отменить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
