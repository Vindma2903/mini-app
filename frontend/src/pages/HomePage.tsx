import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { CategoryStrip } from '../components/CategoryStrip'
import { HeroBanner } from '../components/HeroBanner'
import { LiveMatchRow } from '../components/LiveMatchRow'
import { MatchCard } from '../components/MatchCard'
import { SectionHeader } from '../components/SectionHeader'
import { SportTabs } from '../components/SportTabs'
import { StatusBar } from '../components/StatusBar'
import {
  createPrediction,
  getActiveSession,
  getCoachAdvice,
  getDailyLeaderboard,
  getLiveMatches,
  getMatchmakingPreview,
  getMyPrediction,
  getSessionLeaderboard,
} from '../services/gameApi'
import { PATHS } from '../routes/paths'
import { useGameWalletStore } from '../stores/gameWalletStore'
import { useToastStore } from '../stores/toastStore'
import type { BetSelection } from '../stores/gameWalletStore'
import type { CategoryItem, LiveMatchData, MatchCardData, SportTab } from '../types/home'
import type {
  CoachAdvice,
  GameSession,
  LeaderboardEntry,
  LiveMatch,
  MatchmakingPreview,
  Prediction,
} from '../types/game'

const SPORT_TABS: SportTab[] = [
  { id: 'sport', label: 'Спорт', icon: 'trophy' },
  { id: 'esport', label: 'Киберспорт', icon: 'gamepad-2' },
]

const CATEGORIES: CategoryItem[] = [
  { id: 'fb', label: 'Футбол', icon: 'circle', iconColor: '#3b82f6' },
  { id: 'cs2', label: 'CS2', icon: 'crosshair', iconColor: '#ef4444' },
  { id: 'dota', label: 'Dota 2', icon: 'sword', iconColor: '#ef4444' },
  { id: 'val', label: 'Valorant', icon: 'shield', iconColor: '#f97316' },
]

const POPULAR_MATCHES_FALLBACK: MatchCardData[] = [
  {
    id: 'm1',
    league: 'Лига чемпионов',
    leagueIcon: 'circle',
    leagueIconColor: '#3b82f6',
    teamLeft: { name: 'PSG' },
    teamRight: { name: 'Bayern' },
    vsMeta: 'Завтра, 21:00',
    odds: [
      { label: '1', value: '2.10' },
      { label: 'X', value: '3.40' },
      { label: '2', value: '3.05' },
    ],
  },
  {
    id: 'm2',
    league: 'ESL Pro League',
    leagueIcon: 'crosshair',
    leagueIconColor: '#ef4444',
    teamLeft: { name: 'NaVi' },
    teamRight: { name: 'FaZe' },
    vsMeta: 'Сегодня, 18:30',
    odds: [
      { label: '1', value: '1.85' },
      { label: 'X', value: '3.80', variant: 'accent' },
      { label: '2', value: '2.20' },
    ],
  },
]

const LIVE_POPULAR_POLL_MS = 10_000
const BET_ODDS_OPTIONS = [0.5, 1, 1.8, 2.1] as const
const DEPOSIT_PRESETS = [500, 1000, 5000] as const

interface PendingBetDraft {
  match: LiveMatch
  selection: BetSelection
}

const SUPPORTED_SESSION_SPORTS = ['football', 'cs2'] as const
const SUPPORTED_EVENT_TYPE = 'goal'

function formatUpdateTime(value: Date | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)
}

function formatPopularMeta(match: LiveMatch): string {
  const startedAt = match.started_at ? new Date(match.started_at) : null
  const startLabel =
    startedAt && !Number.isNaN(startedAt.getTime())
      ? `Старт ${new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(startedAt)}`
      : null
  const status = match.status_short ?? 'LIVE'
  const statusLabel =
    match.elapsed_minutes != null && ['1H', '2H', 'ET'].includes(status)
      ? `${status}, ${match.elapsed_minutes}'`
      : status
  if (startLabel) {
    return `${startLabel} · ${statusLabel}`
  }
  return statusLabel
}

function formatSessionStatusLabel(status: GameSession['status']): string {
  if (status === 'waiting') return 'Ожидание'
  if (status === 'predicting') return 'Окно открыто'
  if (status === 'locked') return 'Окно закрыто'
  return 'Сессия завершена'
}

function formatMsLabel(valueMs: number): string {
  if (valueMs < 1000) return `${valueMs} мс`
  return `${(valueMs / 1000).toFixed(2)} c`
}

function coachProfileLabel(value: CoachAdvice['timing_profile']): string {
  if (value === 'late') return 'Поздний клик'
  if (value === 'early') return 'Ранний клик'
  return 'Стабильный тайминг'
}

function matchmakingBucketLabel(bucket: string): string {
  if (bucket === 'gold') return 'Gold'
  if (bucket === 'silver') return 'Silver'
  if (bucket === 'bronze') return 'Bronze'
  return bucket
}

function toPopularMatchCard(match: LiveMatch): MatchCardData {
  return {
    id: `live-${match.provider_match_id}`,
    matchId: match.provider_match_id,
    league: match.league,
    leagueIcon: 'circle',
    leagueIconColor: '#3b82f6',
    teamLeft: { name: match.home_team },
    teamRight: { name: match.away_team },
    vsMeta: formatPopularMeta(match),
    // В этом блоке используем live-метрики вместо коэффициентов.
    odds: [
      { label: 'Дом', value: match.home_score == null ? '—' : String(match.home_score) },
      { label: 'Статус', value: match.status_short ?? 'LIVE', variant: 'accent' },
      { label: 'Гости', value: match.away_score == null ? '—' : String(match.away_score) },
    ],
  }
}

function toLiveMatchRow(match: LiveMatch): LiveMatchData {
  const status = match.status_short ?? 'LIVE'
  const timer =
    match.elapsed_minutes != null && ['1H', '2H', 'ET'].includes(status)
      ? `${match.elapsed_minutes}'`
      : status
  return {
    id: `live-row-${match.provider_match_id}`,
    liveLabel: status === 'HT' ? 'HT' : status === 'FT' ? 'FT' : status === 'PEN' ? 'PEN' : 'LIVE',
    timer,
    teamLeft: { name: match.home_team },
    teamRight: { name: match.away_team },
    score: `${match.home_score ?? '—'} - ${match.away_score ?? '—'}`,
    odds: [
      { value: String(match.home_score ?? '—'), tone: 'green' },
      { value: String(match.away_score ?? '—'), tone: 'white' },
    ],
  }
}

export function HomePage(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const bonusRef = useRef<HTMLElement | null>(null)
  const [tab, setTab] = useState('sport')
  const [session, setSession] = useState<GameSession | null>(null)
  const [popularMatches, setPopularMatches] = useState<MatchCardData[]>(POPULAR_MATCHES_FALLBACK)
  const [showAllPopular, setShowAllPopular] = useState(false)
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [lastLiveSuccessAt, setLastLiveSuccessAt] = useState<Date | null>(null)
  const [showAllLive, setShowAllLive] = useState(false)
  const [fundingModalMode, setFundingModalMode] = useState<'none' | 'deposit' | 'welcome'>('none')
  const [pendingBet, setPendingBet] = useState<PendingBetDraft | null>(null)
  const [stakeInput, setStakeInput] = useState('500')
  const [selectedOdds, setSelectedOdds] = useState<(typeof BET_ODDS_OPTIONS)[number]>(1)
  const [betError, setBetError] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [dailyLeaderboard, setDailyLeaderboard] = useState<LeaderboardEntry[]>([])
  const [coachAdvice, setCoachAdvice] = useState<CoachAdvice | null>(null)
  const [matchmakingPreview, setMatchmakingPreview] = useState<MatchmakingPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [predictLoading, setPredictLoading] = useState(false)
  const balance = useGameWalletStore((s) => s.balance)
  const bets = useGameWalletStore((s) => s.bets)
  const placeBet = useGameWalletStore((s) => s.placeBet)
  const settleFromMatches = useGameWalletStore((s) => s.settleFromMatches)
  const addDemoFunds = useGameWalletStore((s) => s.addDemoFunds)
  const claimWelcomeBonus = useGameWalletStore((s) => s.claimWelcomeBonus)
  const welcomeBonusClaimed = useGameWalletStore((s) => s.welcomeBonusClaimed)
  const pushToast = useToastStore((s) => s.push)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const loadGameState = useCallback(async () => {
    try {
      const active = await getActiveSession()
      setSession(active)

      if (!active) {
        const [daily, matchmaking] = await Promise.all([getDailyLeaderboard(), getMatchmakingPreview()])
        setPrediction(null)
        setLeaderboard([])
        setMatchmakingPreview(matchmaking)
        setDailyLeaderboard(daily.items.slice(0, 5))
        try {
          const coach = await getCoachAdvice()
          setCoachAdvice(coach)
        } catch {
          setCoachAdvice(null)
        }
        setError(null)
        return
      }

      const [myPrediction, lb, daily, matchmaking] = await Promise.all([
        getMyPrediction(active.id),
        getSessionLeaderboard(active.id),
        getDailyLeaderboard(),
        getMatchmakingPreview(active.id),
      ])
      setPrediction(myPrediction)
      setLeaderboard(lb.items.slice(0, 5))
      setDailyLeaderboard(daily.items.slice(0, 5))
      setMatchmakingPreview(matchmaking)
      if (myPrediction?.score != null) {
        try {
          const coach = await getCoachAdvice(active.id)
          setCoachAdvice(coach)
        } catch {
          setCoachAdvice(null)
        }
      } else {
        setCoachAdvice(null)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить игровую сессию')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadGameState()
    const id = window.setInterval(() => {
      void loadGameState()
    }, 3000)
    return () => window.clearInterval(id)
  }, [loadGameState])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const loadLiveFeed = useCallback(async () => {
    try {
      const items = await getLiveMatches()
      if (items.length === 0) {
        setPopularMatches(POPULAR_MATCHES_FALLBACK)
        setLiveMatches([])
        return
      }
      const mapped = items.slice(0, 6).map(toPopularMatchCard)
      setPopularMatches(mapped)
      setLiveMatches(items)
      if (items.length > 0) {
        setLastLiveSuccessAt(new Date())
      }
      settleFromMatches(items)
    } catch {
      // Keep the previous list/fallback to avoid breaking Home screen.
    }
  }, [settleFromMatches])

  useEffect(() => {
    void loadLiveFeed()
    const id = window.setInterval(() => {
      void loadLiveFeed()
    }, LIVE_POPULAR_POLL_MS)
    return () => window.clearInterval(id)
  }, [loadLiveFeed])

  useEffect(() => {
    if (location.hash !== '#welcome-bonus') return
    const element = bonusRef.current
    if (!element) return
    window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [location.hash])

  const visibleLiveMatches = useMemo(
    () => (showAllLive ? liveMatches : liveMatches.slice(0, 2)),
    [liveMatches, showAllLive],
  )
  const visiblePopularMatches = useMemo(
    () => (showAllPopular ? popularMatches : popularMatches.slice(0, 2)),
    [popularMatches, showAllPopular],
  )
  const balanceLabel = useMemo(() => new Intl.NumberFormat('ru-RU').format(balance), [balance])
  const activeWalletBets = useMemo(() => bets.filter((item) => item.status === 'open'), [bets])

  const stakeValue = useMemo(() => Number(stakeInput.replace(/\s+/g, '').replace(',', '.')), [stakeInput])
  const potentialWinValue = useMemo(
    () => (Number.isFinite(stakeValue) && stakeValue > 0 ? Math.round(stakeValue * selectedOdds) : 0),
    [selectedOdds, stakeValue],
  )
  const potentialWinLabel = useMemo(() => {
    if (!Number.isFinite(stakeValue) || stakeValue <= 0) return '—'
    return new Intl.NumberFormat('ru-RU').format(potentialWinValue)
  }, [potentialWinValue, stakeValue])

  const onOpenBetCoupon = useCallback((match: LiveMatch, selection: BetSelection) => {
    setPendingBet({ match, selection })
    setBetError(null)
  }, [])

  const onConfirmBet = useCallback(() => {
    if (!pendingBet) return
    const result = placeBet({
      match: pendingBet.match,
      selection: pendingBet.selection,
      stake: stakeValue,
      odds: selectedOdds,
    })
    if (!result.ok) {
      setBetError(result.error ?? 'Не удалось поставить')
      return
    }
    setBetError(null)
    setPendingBet(null)
  }, [pendingBet, placeBet, selectedOdds, stakeValue])

  const nudgeStake = useCallback((delta: number) => {
    const current = Number.isFinite(stakeValue) ? stakeValue : 0
    const next = Math.max(0, Math.round(current + delta))
    setStakeInput(String(next))
  }, [stakeValue])

  const openBetByMatchId = useMemo(() => {
    const map = new Map<number, string>()
    for (const bet of bets) {
      if (bet.status !== 'open') continue
      map.set(
        bet.matchId,
        bet.selection === 'home' ? 'Дом' : bet.selection === 'away' ? 'Гости' : 'Ничья',
      )
    }
    return map
  }, [bets])

  const onPredictNow = useCallback(async () => {
    if (!session) return
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
  }, [session])

  const statusText = useMemo(() => {
    if (!session) return 'Сейчас нет активной сессии'
    if (session.status === 'waiting') return 'Сессия создана, ждём открытия окна прогнозов'
    if (session.status === 'predicting') return 'Окно прогнозов открыто'
    if (session.status === 'locked') return 'Окно закрыто, ждём фиксацию события'
    return 'Сессия завершена, результаты готовы'
  }, [session])

  const isSupportedSession = useMemo(() => {
    if (!session) return false
    return SUPPORTED_SESSION_SPORTS.includes(session.sport as (typeof SUPPORTED_SESSION_SPORTS)[number]) &&
      session.event_type === SUPPORTED_EVENT_TYPE
  }, [session])

  const windowTimerLabel = useMemo(() => {
    if (!session) return '—'
    if (session.status === 'resolved') return 'Сессия закрыта'
    if (session.status === 'locked') return 'Прием прогнозов завершен'
    if (session.status === 'waiting') return 'Ожидаем старт окна прогнозов'

    const createdAtMs = new Date(session.created_at).getTime()
    if (!Number.isFinite(createdAtMs)) return '—'
    const endsAtMs = createdAtMs + session.prediction_window_ms
    const leftMs = Math.max(0, endsAtMs - nowMs)
    const mm = Math.floor(leftMs / 60_000)
    const ss = Math.floor((leftMs % 60_000) / 1000)
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }, [nowMs, session])

  const resultCard = useMemo(() => {
    if (!prediction || prediction.score == null || prediction.delta_ms == null) return null
    const grade = prediction.delta_ms <= 1500 ? 'Отлично' : prediction.delta_ms <= 5000 ? 'Хорошо' : 'Можно лучше'
    return {
      scoreLabel: `${prediction.score} очков`,
      deltaLabel: formatMsLabel(prediction.delta_ms),
      grade,
      commentary: prediction.ai_commentary,
    }
  }, [prediction])

  const onDepositPreset = useCallback(
    (amount: number) => {
      if (fundingModalMode === 'welcome') {
        const result = claimWelcomeBonus(amount)
        if (!result.ok && result.error) {
          pushToast({
            kind: 'info',
            title: 'Welcome-бонус',
            description: result.error,
          })
        }
      } else {
        addDemoFunds(amount)
      }
      setFundingModalMode('none')
    },
    [addDemoFunds, claimWelcomeBonus, fundingModalMode, pushToast],
  )

  const onWelcomeCtaClick = useCallback(() => {
    if (welcomeBonusClaimed) {
      pushToast({
        kind: 'info',
        title: 'Бонус за вход',
        description: 'Бонус уже активирован',
      })
      return
    }
    setFundingModalMode('welcome')
  }, [pushToast, welcomeBonusClaimed])

  const onOpenMatchWatch = useCallback(
    (matchId: number) => {
      navigate(`${PATHS.watch}/${matchId}`)
    },
    [navigate],
  )

  const onOpenRanking = useCallback(() => {
    navigate(PATHS.ranking)
  }, [navigate])

  return (
    <>
      <StatusBar />
      <AppHeader balance={balanceLabel} onDepositClick={() => setFundingModalMode('deposit')} />
      <main className="flex min-h-0 flex-1 flex-col gap-5 px-4 pb-5">
        <section id="welcome-bonus" ref={bonusRef}>
          <HeroBanner onCtaClick={onWelcomeCtaClick} isClaimed={welcomeBonusClaimed} />
        </section>
        <section className="rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#1c2036]">
          <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-white">
            {session ? session.title : 'Активная сессия'}
          </h2>
          <p className="mt-1 font-[family-name:var(--font-inter)] text-xs text-[#8b95b0]">{statusText}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-[#1c2036] p-2">
              <p className="text-[10px] text-[#8b95b0]">Событие</p>
              <p className="text-sm font-semibold text-white">{session?.event_type ?? '—'}</p>
            </div>
            <div className="rounded-lg bg-[#1c2036] p-2">
              <p className="text-[10px] text-[#8b95b0]">Статус окна</p>
              <p className="text-sm font-semibold text-white">{session ? formatSessionStatusLabel(session.status) : '—'}</p>
            </div>
            <div className="rounded-lg bg-[#1c2036] p-2">
              <p className="text-[10px] text-[#8b95b0]">Таймер</p>
              <p className="text-sm font-semibold text-white">{windowTimerLabel}</p>
            </div>
          </div>
          {!isSupportedSession && session ? (
            <p className="mt-2 text-xs text-amber-400">
              Для MVP поддерживаются только goal и виды спорта football/cs2.
            </p>
          ) : null}
          {loading ? <p className="mt-2 text-xs text-[#8b95b0]">Загрузка...</p> : null}
          {prediction ? (
            <p className="mt-3 text-sm font-semibold text-[#22c55e]">
              Прогноз принят: {new Date(prediction.predicted_at_ms).toLocaleTimeString()}
            </p>
          ) : null}
          {session?.status === 'predicting' && !prediction ? (
            <button
              type="button"
              onClick={onPredictNow}
              disabled={predictLoading || !isSupportedSession}
              className="mt-3 h-11 w-full rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-sm font-bold text-[#04120a] disabled:opacity-70"
            >
              {predictLoading ? 'Отправка...' : 'Сделать прогноз сейчас'}
            </button>
          ) : null}
          {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
          {resultCard ? (
            <div className="mt-3 rounded-xl bg-[#1c2036] p-3">
              <p className="text-[10px] text-[#8b95b0]">Результат прогноза</p>
              <p className="mt-1 text-sm font-semibold text-white">
                Вы промахнулись на <span className="text-[#fbbf24]">{resultCard.deltaLabel}</span>
              </p>
              <p className="mt-1 text-sm font-bold text-[#22c55e]">{resultCard.scoreLabel}</p>
              <p className="mt-1 text-xs text-[#8b95b0]">Оценка точности: {resultCard.grade}</p>
              {resultCard.commentary ? <p className="mt-1 text-xs text-[#8b95b0]">{resultCard.commentary}</p> : null}
            </div>
          ) : null}
          {coachAdvice ? (
            <div className="mt-3 rounded-xl bg-[#1c2036] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95b0]">AI-коуч по таймингу</p>
              <p className="mt-1 text-sm font-semibold text-white">{coachAdvice.summary}</p>
              <p className="mt-1 text-xs text-[#8b95b0]">
                Профиль: {coachProfileLabel(coachAdvice.timing_profile)}
                {coachAdvice.avg_delta_ms != null ? ` · Средняя погрешность ${formatMsLabel(coachAdvice.avg_delta_ms)}` : ''}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {coachAdvice.tips.slice(0, 2).map((tip, index) => (
                  <p key={`${coachAdvice.session_id}-tip-${index}`} className="text-xs text-[#8b95b0]">
                    • {tip}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {matchmakingPreview ? (
            <div className="mt-3 rounded-xl bg-[#1c2036] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95b0]">AI-матчмейкинг турниров</p>
              <p className="mt-1 text-sm font-semibold text-white">
                Ваш дивизион: {matchmakingPreview.your_bucket ? matchmakingBucketLabel(matchmakingPreview.your_bucket) : '—'}
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {matchmakingPreview.buckets
                  .filter((bucket) => bucket.players.length > 0)
                  .map((bucket) => (
                    <div key={bucket.bucket} className="rounded-lg bg-[#141829] p-2">
                      <p className="text-[10px] font-semibold text-[#8b95b0]">{bucket.title}</p>
                      {bucket.players.slice(0, 3).map((player) => (
                        <div key={`${bucket.bucket}-${player.user_id}`} className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-[#8b95b0]">{player.username}</span>
                          <span className="font-semibold text-white">{Math.round(player.skill_score)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
          {leaderboard.length > 0 ? (
            <div className="mt-3 flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95b0]">Таблица по текущей сессии</p>
              {leaderboard.map((item) => (
                <div key={`${item.user_id}-${item.rank}`} className="flex items-center justify-between text-xs">
                  <span className="text-[#8b95b0]">#{item.rank} {item.username}</span>
                  <span className="font-semibold text-white">{item.total_score}</span>
                </div>
              ))}
            </div>
          ) : null}
          {dailyLeaderboard.length > 0 ? (
            <div className="mt-3 flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95b0]">Лидерборд за день</p>
              {dailyLeaderboard.map((item) => (
                <div key={`daily-${item.user_id}-${item.rank}`} className="flex items-center justify-between text-xs">
                  <span className="text-[#8b95b0]">#{item.rank} {item.username}</span>
                  <span className="font-semibold text-white">{item.total_score}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
        <SportTabs tabs={SPORT_TABS} activeId={tab} onChange={setTab} />
        <CategoryStrip items={CATEGORIES} />
        <section className="flex flex-col gap-3">
          <SectionHeader title="Популярные матчи" />
          <div className="flex flex-col gap-3">
            {visiblePopularMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                fullWidth
                onClick={typeof m.matchId === 'number' ? () => onOpenMatchWatch(m.matchId as number) : undefined}
              />
            ))}
            {popularMatches.length > 2 ? (
              <button
                type="button"
                onClick={() => setShowAllPopular((prev) => !prev)}
                className="h-10 rounded-xl bg-[#1c2036] font-[family-name:var(--font-inter)] text-sm font-semibold text-[#8b95b0]"
              >
                {showAllPopular ? 'Свернуть популярные' : `Все популярные (${popularMatches.length})`}
              </button>
            ) : null}
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Сейчас Live"
            trailing={
              <div className="flex items-center gap-1.5 rounded-md bg-[#ef4444]/20 px-2 py-[3px]">
                <span className="size-1.5 shrink-0 rounded-full bg-[#ef4444]" aria-hidden />
                <span className="font-[family-name:var(--font-inter)] text-[10px] font-bold text-[#ef4444]">
                  {liveMatches.length}
                </span>
              </div>
            }
          />
          <p className="text-xs text-[#8b95b0]">Последнее успешное обновление: {formatUpdateTime(lastLiveSuccessAt)}</p>
          <div className="flex items-center gap-2 rounded-xl bg-[#141829] px-3.5 py-2.5">
            <span className="text-xs font-medium text-[#8b95b0]">Ставка</span>
            <input
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              inputMode="numeric"
              className="h-8 w-24 rounded-lg bg-[#1c2036] px-2 text-sm font-semibold text-white outline-none ring-1 ring-inset ring-[#232844] focus:ring-[#8b5cf6]"
            />
            <span className="text-xs font-medium text-[#8b95b0]">₽</span>
            <div className="ml-auto flex items-center gap-1 rounded-lg bg-[#1c2036] p-1">
              {BET_ODDS_OPTIONS.map((odd) => (
                <button
                  key={odd}
                  type="button"
                  onClick={() => setSelectedOdds(odd)}
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    selectedOdds === odd ? 'bg-[#8b5cf6] text-white' : 'text-[#8b95b0]'
                  }`}
                >
                  x{odd}
                </button>
              ))}
            </div>
          </div>
          {betError ? <p className="text-xs text-red-400">{betError}</p> : null}
          <section className="flex flex-col gap-2 rounded-xl bg-[#141829] p-3">
            <h3 className="text-sm font-semibold text-white">Мои активные ставки</h3>
            {activeWalletBets.length === 0 ? (
              <p className="text-xs text-[#8b95b0]">Пока нет активных ставок</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {activeWalletBets.slice(0, 6).map((bet) => (
                  <div key={bet.id} className="flex items-center justify-between text-xs">
                    <span className="min-w-0 truncate text-[#8b95b0]">
                      {bet.homeTeam} — {bet.awayTeam}
                    </span>
                    <span className="shrink-0 font-semibold text-white">
                      {bet.selection === 'home' ? 'Дом' : bet.selection === 'away' ? 'Гости' : 'Ничья'} x{bet.odds} ·{' '}
                      {new Intl.NumberFormat('ru-RU').format(bet.stake)} ₽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <div className="flex flex-col gap-3">
            {visibleLiveMatches.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#8b95b0]">Сейчас live-матчей нет у провайдера</p>
            ) : null}
            {visibleLiveMatches.map((m) => {
              const openSelection = openBetByMatchId.get(m.provider_match_id)
              const status = (m.status_short ?? '').toUpperCase()
              const isFinished = status === 'FT'
              return (
                <div key={m.provider_match_id} className="flex flex-col gap-2">
                  <LiveMatchRow match={toLiveMatchRow(m)} onClick={() => onOpenMatchWatch(m.provider_match_id)} />
                  {openSelection ? (
                    <p className="px-1 text-xs text-[#22c55e]">Активная ставка: {openSelection}</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={isFinished}
                        onClick={() => onOpenBetCoupon(m, 'home')}
                        className="h-9 rounded-lg bg-[#1c2036] text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Ставка на Дом
                      </button>
                      <button
                        type="button"
                        disabled={isFinished}
                        onClick={() => onOpenBetCoupon(m, 'draw')}
                        className="h-9 rounded-lg bg-[#1c2036] text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Ставка на ничью
                      </button>
                      <button
                        type="button"
                        disabled={isFinished}
                        onClick={() => onOpenBetCoupon(m, 'away')}
                        className="h-9 rounded-lg bg-[#1c2036] text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Ставка на Гости
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {liveMatches.length > 2 ? (
              <button
                type="button"
                onClick={() => setShowAllLive((prev) => !prev)}
                className="h-10 rounded-xl bg-[#1c2036] font-[family-name:var(--font-inter)] text-sm font-semibold text-[#8b95b0]"
              >
                {showAllLive ? 'Свернуть Live' : `Все сейчас Live (${liveMatches.length})`}
              </button>
            ) : null}
          </div>
        </section>
        <section
          onClick={onOpenRanking}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenRanking()
            }
          }}
          role="button"
          tabIndex={0}
          className="cursor-pointer rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#1c2036]"
          aria-label="Открыть полный рейтинг игроков"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">Рейтинг игроков</h2>
            <span className="text-xs font-semibold text-[#8b5cf6]">Открыть</span>
          </div>
          {dailyLeaderboard.length === 0 ? (
            <p className="mt-2 text-xs text-[#8b95b0]">Пока нет данных рейтинга</p>
          ) : (
            <div className="mt-3 flex flex-col gap-1.5">
              {dailyLeaderboard.slice(0, 3).map((item) => (
                <div key={`home-rating-${item.user_id}-${item.rank}`} className="flex items-center justify-between text-xs">
                  <span className="text-[#8b95b0]">
                    #{item.rank} {item.username}
                  </span>
                  <span className="font-semibold text-white">{item.total_score}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      {fundingModalMode !== 'none' ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#02040bcc]/80 p-4">
          <div className="w-full max-w-[393px] rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#2a2f48]">
            <div className="mb-3">
              <h3 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">
                {fundingModalMode === 'welcome' ? 'Бонус за вход +100%' : 'Демо-пополнение'}
              </h3>
              <p className="mt-1 text-xs text-[#8b95b0]">
                {fundingModalMode === 'welcome'
                  ? 'Выберите сумму первого депозита. Бонус начислим автоматически +100%.'
                  : 'Выберите сумму для игрового баланса'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEPOSIT_PRESETS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => onDepositPreset(amount)}
                  className="h-10 rounded-lg bg-[#1c2036] text-sm font-semibold text-white hover:bg-[#222948]"
                >
                  +{new Intl.NumberFormat('ru-RU').format(amount)} ₽
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFundingModalMode('none')}
              className="mt-3 h-10 w-full rounded-lg bg-[#0f1322] text-sm font-medium text-[#8b95b0]"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
      {pendingBet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#02040bcc]/80 p-4">
          <div className="w-full max-w-[393px] rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#2a2f48]">
            <h3 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">Подтверждение ставки</h3>
            <div className="mt-3 rounded-xl bg-[#1c2036] p-3">
              <p className="text-[10px] text-[#8b95b0]">Сумма ставки</p>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={stakeInput}
                  onChange={(e) => setStakeInput(e.target.value)}
                  inputMode="numeric"
                  className="h-10 w-full rounded-lg bg-[#0f1322] px-3 text-sm font-semibold text-white outline-none ring-1 ring-inset ring-[#2a2f48] focus:ring-[#8b5cf6]"
                />
                <span className="text-xs font-medium text-[#8b95b0]">₽</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[100, 500, 1000].map((value) => (
                  <button
                    key={`minus-${value}`}
                    type="button"
                    onClick={() => nudgeStake(-value)}
                    className="h-8 rounded-lg bg-[#0f1322] text-xs font-medium text-[#8b95b0]"
                  >
                    -{value}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[100, 500, 1000].map((value) => (
                  <button
                    key={`plus-${value}`}
                    type="button"
                    onClick={() => nudgeStake(value)}
                    className="h-8 rounded-lg bg-[#0f1322] text-xs font-medium text-[#8b95b0]"
                  >
                    +{value}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 rounded-xl bg-[#1c2036] p-3 text-xs text-[#8b95b0]">
              <p className="font-semibold text-white">
                {pendingBet.match.home_team} — {pendingBet.match.away_team}
              </p>
              <p className="mt-1">
                Исход:{' '}
                <span className="font-semibold text-white">
                  {pendingBet.selection === 'home' ? 'Дом' : pendingBet.selection === 'away' ? 'Гости' : 'Ничья'}
                </span>
              </p>
              <p className="mt-1">
                Сумма: <span className="font-semibold text-white">{stakeInput} ₽</span>
              </p>
              <p className="mt-1">
                Коэффициент: <span className="font-semibold text-white">x{selectedOdds}</span>
              </p>
              <p className="mt-1">
                Потенциальный выигрыш: <span className="font-semibold text-[#22c55e]">{potentialWinLabel} ₽</span>
              </p>
              <p className="mt-1">
                Баланс после ставки:{' '}
                <span className={`font-semibold ${balance - stakeValue >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {new Intl.NumberFormat('ru-RU').format(balance - (Number.isFinite(stakeValue) ? stakeValue : 0))} ₽
                </span>
              </p>
              <p className="mt-1">
                Баланс при выигрыше:{' '}
                <span className="font-semibold text-[#22c55e]">
                  {new Intl.NumberFormat('ru-RU').format(
                    balance - (Number.isFinite(stakeValue) ? stakeValue : 0) + potentialWinValue,
                  )}{' '}
                  ₽
                </span>
              </p>
            </div>
            {(!Number.isFinite(stakeValue) || stakeValue <= 0 || balance < stakeValue) && (
              <p className="mt-2 text-xs text-red-400">
                {!Number.isFinite(stakeValue) || stakeValue <= 0
                  ? 'Введите корректную сумму ставки'
                  : 'Недостаточно средств на балансе'}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPendingBet(null)}
                className="h-10 rounded-lg bg-[#0f1322] text-sm font-medium text-[#8b95b0]"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={onConfirmBet}
                disabled={!Number.isFinite(stakeValue) || stakeValue <= 0 || balance < stakeValue}
                className="h-10 rounded-lg bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-sm font-bold text-[#04120a] disabled:opacity-50"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
