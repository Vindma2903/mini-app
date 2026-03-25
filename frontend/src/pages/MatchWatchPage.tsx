import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, PlayCircle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { StatusBar } from '../components/StatusBar'
import { createPrediction, getActiveSession, getLiveMatches, getMyPrediction } from '../services/gameApi'
import { useGameWalletStore } from '../stores/gameWalletStore'
import type { GameSession, LiveMatch, Prediction } from '../types/game'

const LIVE_POLL_MS = 10_000
const BET_ODDS_OPTIONS = [0.5, 1, 1.8, 2.1] as const
const DEFAULT_STAKE_INPUT = '500'
const DEFAULT_ODDS = 1 as const

interface MatchCouponDraft {
  stakeInput: string
  selectedOdds: (typeof BET_ODDS_OPTIONS)[number]
}

function timerLabel(match: LiveMatch | null): string {
  if (!match) return '—'
  const status = (match.status_short ?? 'LIVE').toUpperCase()
  if (match.elapsed_minutes != null && ['1H', '2H', 'ET'].includes(status)) {
    return `${match.elapsed_minutes}'`
  }
  return status
}

function sessionStatusLabel(session: GameSession | null): string {
  if (!session) return 'Нет активной сессии'
  if (session.status === 'waiting') return 'Ожидание открытия окна'
  if (session.status === 'predicting') return 'Окно прогнозов открыто'
  if (session.status === 'locked') return 'Окно прогнозов закрыто'
  return 'Сессия завершена'
}

export function MatchWatchPage(): JSX.Element {
  const navigate = useNavigate()
  const { matchId } = useParams<{ matchId: string }>()
  const [match, setMatch] = useState<LiveMatch | null>(null)
  const [session, setSession] = useState<GameSession | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [predictLoading, setPredictLoading] = useState(false)
  const [stakeInput, setStakeInput] = useState(DEFAULT_STAKE_INPUT)
  const [selectedOdds, setSelectedOdds] = useState<(typeof BET_ODDS_OPTIONS)[number]>(DEFAULT_ODDS)
  const [couponDraftByMatchId, setCouponDraftByMatchId] = useState<Record<number, MatchCouponDraft>>({})
  const setPredictionStake = useGameWalletStore((s) => s.setPredictionStake)
  const numericMatchId = Number(matchId)

  const load = useCallback(async () => {
    if (!Number.isFinite(numericMatchId)) {
      setError('Некорректный ID матча')
      setLoading(false)
      return
    }
    try {
      const [live, active] = await Promise.all([getLiveMatches(), getActiveSession()])
      const target = live.find((item) => item.provider_match_id === numericMatchId) ?? null
      setMatch(target)
      setSession(active)
      if (active) {
        const mine = await getMyPrediction(active.id)
        setPrediction(mine)
      } else {
        setPrediction(null)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить экран трансляции')
    } finally {
      setLoading(false)
    }
  }, [numericMatchId])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => {
      void load()
    }, LIVE_POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  useEffect(() => {
    if (!Number.isFinite(numericMatchId)) return
    const draft = couponDraftByMatchId[numericMatchId]
    if (draft) {
      setStakeInput(draft.stakeInput)
      setSelectedOdds(draft.selectedOdds)
    } else {
      setStakeInput(DEFAULT_STAKE_INPUT)
      setSelectedOdds(DEFAULT_ODDS)
    }
    setError(null)
  }, [couponDraftByMatchId, numericMatchId])

  const onStakeInputChange = useCallback(
    (nextValue: string) => {
      setStakeInput(nextValue)
      if (!Number.isFinite(numericMatchId)) return
      setCouponDraftByMatchId((prev) => ({
        ...prev,
        [numericMatchId]: {
          stakeInput: nextValue,
          selectedOdds,
        },
      }))
    },
    [numericMatchId, selectedOdds],
  )

  const onSelectOdds = useCallback(
    (odd: (typeof BET_ODDS_OPTIONS)[number]) => {
      setSelectedOdds(odd)
      if (!Number.isFinite(numericMatchId)) return
      setCouponDraftByMatchId((prev) => ({
        ...prev,
        [numericMatchId]: {
          stakeInput,
          selectedOdds: odd,
        },
      }))
    },
    [numericMatchId, stakeInput],
  )

  const onPredict = useCallback(async () => {
    if (!session) {
      setError('Сейчас нет активной сессии для прогноза')
      return
    }
    const stakeValue = Number(stakeInput.replace(/\s+/g, '').replace(',', '.'))
    if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
      setError('Укажи сумму прогноза больше 0 ₽')
      return
    }
    if (session.status !== 'predicting') {
      setError('Окно прогнозов сейчас закрыто')
      return
    }
    if (prediction) {
      setError('Вы уже отправили прогноз в этой сессии')
      return
    }
    setPredictionStake(session.id, Math.round(stakeValue))
    setPredictLoading(true)
    try {
      const created = await createPrediction(session.id)
      setPrediction(created)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить прогноз')
    } finally {
      setPredictLoading(false)
    }
  }, [prediction, session, setPredictionStake, stakeInput])

  const scoreLabel = useMemo(() => {
    if (!match) return '— : —'
    return `${match.home_score ?? '—'} : ${match.away_score ?? '—'}`
  }, [match])

  const stakeValue = useMemo(() => Number(stakeInput.replace(/\s+/g, '').replace(',', '.')), [stakeInput])
  const potentialWinLabel = useMemo(() => {
    if (!Number.isFinite(stakeValue) || stakeValue <= 0) return '—'
    return new Intl.NumberFormat('ru-RU').format(Math.round(stakeValue * selectedOdds))
  }, [selectedOdds, stakeValue])

  return (
    <>
      <StatusBar />
      <header className="flex h-14 w-full shrink-0 items-center gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-9 items-center justify-center rounded-xl bg-[#141829] text-[#8b95b0]"
          aria-label="Назад"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={2.25} aria-hidden />
        </button>
        <h1 className="font-[family-name:var(--font-sora)] text-[22px] font-bold leading-none tracking-[-0.5px] text-white">
          Просмотр матча
        </h1>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
        <section className="rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#1c2036]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Трансляция (demo)</p>
            <span className="rounded-md bg-[#ef4444]/20 px-2 py-0.5 text-[10px] font-bold text-[#ef4444]">
              {timerLabel(match)}
            </span>
          </div>
          <div className="flex h-48 items-center justify-center rounded-xl bg-gradient-to-br from-[#1c2036] to-[#101426]">
            <div className="flex flex-col items-center gap-2 text-center">
              <PlayCircle className="size-10 text-[#8b95b0]" strokeWidth={1.8} aria-hidden />
              <p className="text-sm font-semibold text-white">Демо-плеер трансляции</p>
              <p className="text-xs text-[#8b95b0]">Видео-поток будет подключен на следующем этапе</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#1c2036]">
          <p className="text-xs text-[#8b95b0]">{match?.league ?? 'Live матч'}</p>
          <p className="mt-1 text-base font-bold text-white">
            {match ? `${match.home_team} — ${match.away_team}` : 'Матч не найден в live-выдаче'}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#22c55e]">{scoreLabel}</p>
          <p className="mt-2 text-xs text-[#8b95b0]">Статус сессии: {sessionStatusLabel(session)}</p>
          {prediction ? (
            <p className="mt-1 text-xs text-[#22c55e]">
              Прогноз отправлен в {new Date(prediction.predicted_at_ms).toLocaleTimeString()}
            </p>
          ) : null}
          <div className="mt-3 rounded-xl bg-[#1c2036] p-3">
            <p className="text-[10px] text-[#8b95b0]">Сумма прогноза</p>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={stakeInput}
                onChange={(e) => onStakeInputChange(e.target.value)}
                inputMode="numeric"
                className="h-10 w-full rounded-lg bg-[#0f1322] px-3 text-sm font-semibold text-white outline-none ring-1 ring-inset ring-[#2a2f48] focus:ring-[#8b5cf6]"
              />
              <span className="text-xs font-medium text-[#8b95b0]">₽</span>
            </div>
            <div className="mt-2 flex items-center gap-1 rounded-lg bg-[#0f1322] p-1">
              {BET_ODDS_OPTIONS.map((odd) => (
                <button
                  key={odd}
                  type="button"
                  onClick={() => onSelectOdds(odd)}
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    selectedOdds === odd ? 'bg-[#8b5cf6] text-white' : 'text-[#8b95b0]'
                  }`}
                >
                  x{odd}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#8b95b0]">
              Потенциальный выигрыш: <span className="font-semibold text-[#22c55e]">{potentialWinLabel} ₽</span>
            </p>
          </div>
          {loading ? <p className="mt-2 text-xs text-[#8b95b0]">Загрузка...</p> : null}
          {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
          <button
            type="button"
            onClick={onPredict}
            disabled={predictLoading || !session || session.status !== 'predicting' || Boolean(prediction)}
            className="mt-3 h-11 w-full rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-sm font-bold text-[#04120a] disabled:opacity-60"
          >
            {predictLoading ? 'Отправка...' : 'Сделать прогноз сейчас'}
          </button>
        </section>
      </main>
    </>
  )
}
