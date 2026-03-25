import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Circle, Crosshair } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { CategoryStrip } from '../components/CategoryStrip'
import { HeroBanner } from '../components/HeroBanner'
import { LiveMatchRow } from '../components/LiveMatchRow'
import { MatchCard } from '../components/MatchCard'
import { SectionHeader } from '../components/SectionHeader'
import { SportTabs } from '../components/SportTabs'
import { StatusBar } from '../components/StatusBar'
import { buildDemoLeaderboard } from '../data/demoLeaderboard'
import { getDemoEsportMatches, getDemoFootballMatches } from '../data/demoLiveMatches'
import {
  createPrediction,
  getActiveSession,
  getCoachAdvice,
  getDailyLeaderboard,
  getEsportsMatches,
  getLiveMatches,
  getMyPrediction,
  getPopularMatches,
  getSessionLeaderboard,
} from '../services/gameApi'
import { PATHS } from '../routes/paths'
import { useGameWalletStore } from '../stores/gameWalletStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useToastStore } from '../stores/toastStore'
import { useAuth } from '../hooks/useAuth'
import type { BetSelection } from '../stores/gameWalletStore'
import type { CategoryItem, LiveMatchData, MatchCardData, SportTab } from '../types/home'
import type {
  CoachAdvice,
  GameSession,
  LeaderboardEntry,
  LiveMatch,
  Prediction,
} from '../types/game'

const SPORT_TABS: SportTab[] = [
  { id: 'sport', label: 'Спорт', icon: 'trophy' },
  { id: 'esport', label: 'Киберспорт', icon: 'gamepad-2' },
]
const DISPLAY_TIME_ZONE = 'Europe/Moscow'
const DISPLAY_TIME_ZONE_LABEL = 'МСК'

const CATEGORIES: CategoryItem[] = [
  { id: 'fb', label: 'Футбол', icon: 'circle', iconColor: '#3b82f6' },
  { id: 'cs2', label: 'CS2', icon: 'crosshair', iconColor: '#ef4444' },
]

const LIVE_POPULAR_POLL_MS = 10_000
const ESPORTS_POLL_MS = 20_000
const BET_ODDS_OPTIONS = [0.5, 1, 1.8, 2.1] as const
const DEPOSIT_PRESETS = [500, 1000, 5000] as const

interface PendingBetDraft {
  match: LiveMatch
  selection: BetSelection
}

const SUPPORTED_SESSION_SPORTS = ['football', 'cs2'] as const
const SUPPORTED_EVENT_TYPE = 'goal'
const DASH_SEPARATOR = ' — '

function normalizeSessionSport(value: string | null | undefined): string {
  if (!value) return ''
  const normalized = value.toLowerCase().trim()
  if (normalized === 'csgo') return 'cs2'
  return normalized
}

function normalizeEventType(value: string | null | undefined): string {
  if (!value) return ''
  const normalized = value.toLowerCase().trim()
  // Backward compatibility for legacy auto-session rows.
  if (normalized === 'round' || normalized === 'kill') return 'goal'
  return normalized
}

interface SessionMatchMeta {
  homeTeam: string | null
  awayTeam: string | null
  league: string | null
  startTimeLabel: string | null
}

function parseSessionMatchMeta(title: string | null | undefined): SessionMatchMeta {
  if (!title) {
    return {
      homeTeam: null,
      awayTeam: null,
      league: null,
      startTimeLabel: null,
    }
  }

  const compactTitle = title.trim()
  const leagueMatch = compactTitle.match(/\(([^)]+)\)/)
  const league = leagueMatch?.[1]?.trim() ?? null
  const titleWithoutLeague = compactTitle.replace(/\s*\([^)]+\)\s*/, '').trim()
  const teamParts = titleWithoutLeague.split(DASH_SEPARATOR).map((part) => part.trim())
  const homeTeam = teamParts[0] || null
  const awayTeam = teamParts[1] || null

  const explicitTime = compactTitle.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
  const startTimeLabel = explicitTime ? `${explicitTime[0]} ${DISPLAY_TIME_ZONE_LABEL}` : null

  return {
    homeTeam,
    awayTeam,
    league,
    startTimeLabel,
  }
}

function normalizeTeamKey(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatLiveStatusLabel(statusShort: string | null, elapsedMinutes: number | null): string {
  const status = (statusShort ?? '').toUpperCase()
  if ((status === '1H' || status === '2H' || status === 'ET') && elapsedMinutes != null) {
    return `Идёт матч · ${elapsedMinutes}'`
  }
  if (status === 'HT') return 'Перерыв'
  if (status === 'FT') return 'Матч завершён'
  if (status === 'PEN') return 'Пенальти'
  if (status === 'NS') return 'Скоро начнётся'
  if (status === 'LIVE') return 'Идёт матч'
  return 'Статус уточняется'
}

function teamsMatch(
  sessionHome: string | null | undefined,
  sessionAway: string | null | undefined,
  matchHome: string | null | undefined,
  matchAway: string | null | undefined,
): boolean {
  const sHome = normalizeTeamKey(sessionHome)
  const sAway = normalizeTeamKey(sessionAway)
  const mHome = normalizeTeamKey(matchHome)
  const mAway = normalizeTeamKey(matchAway)
  if (!sHome || !sAway || !mHome || !mAway) return false
  if (sHome === mHome && sAway === mAway) return true
  if (sHome === mAway && sAway === mHome) return true
  return false
}

function formatUpdateTime(value: Date | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)
}

function getDemoCountdownLabel(match: LiveMatch): string | null {
  if (!match.league.includes('(Demo)')) return null
  if (!match.started_at) return 'Демо-матч'
  const startedAtMs = new Date(match.started_at).getTime()
  if (!Number.isFinite(startedAtMs)) return 'Демо-матч'
  if ((match.status_short ?? '').toUpperCase() === 'FT') return 'Демо-матч · завершен'
  const leftMs = Math.max(0, 2 * 60_000 - (Date.now() - startedAtMs))
  const mm = Math.floor(leftMs / 60_000)
  const ss = Math.floor((leftMs % 60_000) / 1000)
  return `Демо-матч · завершится через ${String(mm)}:${String(ss).padStart(2, '0')}`
}

function getDemoCountdownShort(match: LiveMatch): string | null {
  if (!match.league.includes('(Demo)')) return null
  if (!match.started_at) return null
  const startedAtMs = new Date(match.started_at).getTime()
  if (!Number.isFinite(startedAtMs)) return null
  if ((match.status_short ?? '').toUpperCase() === 'FT') return 'FT'
  const leftMs = Math.max(0, 2 * 60_000 - (Date.now() - startedAtMs))
  const mm = Math.floor(leftMs / 60_000)
  const ss = Math.floor((leftMs % 60_000) / 1000)
  return `${String(mm)}:${String(ss).padStart(2, '0')}`
}

function formatPopularMeta(match: LiveMatch): string {
  const demoLabel = getDemoCountdownLabel(match)
  if (demoLabel) return demoLabel
  const startedAt = match.started_at ? new Date(match.started_at) : null
  const startLabel =
    startedAt && !Number.isNaN(startedAt.getTime())
      ? `Старт ${new Intl.DateTimeFormat('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: DISPLAY_TIME_ZONE,
        }).format(startedAt)} ${DISPLAY_TIME_ZONE_LABEL}`
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
  if (status === 'locked') return 'Приём прогнозов завершён'
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
  const demoLabel = getDemoCountdownLabel(match)
  const demoShort = getDemoCountdownShort(match)
  const status = match.status_short ?? 'LIVE'
  const timer =
    match.elapsed_minutes != null && ['1H', '2H', 'ET'].includes(status)
      ? `${match.elapsed_minutes}'`
      : status
  return {
    id: `live-row-${match.provider_match_id}`,
    liveLabel: demoLabel ? 'DEMO' : status === 'HT' ? 'HT' : status === 'FT' ? 'FT' : status === 'PEN' ? 'PEN' : 'LIVE',
    timer: demoShort ?? timer,
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
  const { user } = useAuth()
  const bonusRef = useRef<HTMLElement | null>(null)
  const [tab, setTab] = useState('sport')
  const [session, setSession] = useState<GameSession | null>(null)
  const [popularMatches, setPopularMatches] = useState<MatchCardData[]>([])
  const [showAllPopular, setShowAllPopular] = useState(false)
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [esportsMatches, setEsportsMatches] = useState<LiveMatch[]>([])
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [predictLoading, setPredictLoading] = useState(false)
  const demoDataEnabled = useSettingsStore((s) => s.demoDataEnabled)
  const balance = useGameWalletStore((s) => s.balance)
  const bets = useGameWalletStore((s) => s.bets)
  const placeBet = useGameWalletStore((s) => s.placeBet)
  const setPredictionStake = useGameWalletStore((s) => s.setPredictionStake)
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
        const daily = await getDailyLeaderboard()
        setPrediction(null)
        setLeaderboard([])
        const fallbackDaily = demoDataEnabled && daily.items.length === 0 ? buildDemoLeaderboard(user) : daily.items
        setDailyLeaderboard(fallbackDaily.slice(0, 5))
        try {
          const coach = await getCoachAdvice()
          setCoachAdvice(coach)
        } catch {
          setCoachAdvice(null)
        }
        setError(null)
        return
      }

      const [myPrediction, lb, daily] = await Promise.all([
        getMyPrediction(active.id),
        getSessionLeaderboard(active.id),
        getDailyLeaderboard(),
      ])
      setPrediction(myPrediction)
      setLeaderboard(lb.items.slice(0, 5))
      const fallbackDaily = demoDataEnabled && daily.items.length === 0 ? buildDemoLeaderboard(user) : daily.items
      setDailyLeaderboard(fallbackDaily.slice(0, 5))
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
  }, [demoDataEnabled, user])

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
      const [liveItems, popularItems] = await Promise.all([
        getLiveMatches(),
        getPopularMatches().catch(() => []),
      ])
      if (liveItems.length === 0 && popularItems.length === 0) {
        if (demoDataEnabled) {
          const demoFootball = getDemoFootballMatches()
          setLiveMatches(demoFootball)
          setPopularMatches(demoFootball.slice(0, 6).map(toPopularMatchCard))
          settleFromMatches(demoFootball)
          setLastLiveSuccessAt(new Date())
        } else {
          setPopularMatches([])
          setLiveMatches([])
        }
        return
      }

      const popularSource = popularItems.length > 0 ? popularItems : liveItems
      const mapped = popularSource.slice(0, 6).map(toPopularMatchCard)
      setPopularMatches(mapped)
      setLiveMatches(liveItems)
      if (liveItems.length > 0) {
        setLastLiveSuccessAt(new Date())
      }
      settleFromMatches(liveItems)
    } catch {
      // Keep the previous list/fallback to avoid breaking Home screen.
    }
  }, [demoDataEnabled, settleFromMatches])

  useEffect(() => {
    void loadLiveFeed()
    const id = window.setInterval(() => {
      void loadLiveFeed()
    }, LIVE_POPULAR_POLL_MS)
    return () => window.clearInterval(id)
  }, [loadLiveFeed])

  const loadEsportsFeed = useCallback(async () => {
    try {
      const items = await getEsportsMatches()
      if (items.length > 0) {
        setEsportsMatches(items)
        setLastLiveSuccessAt(new Date())
      } else if (demoDataEnabled) {
        setEsportsMatches(getDemoEsportMatches())
        setLastLiveSuccessAt(new Date())
      } else {
        setEsportsMatches([])
      }
    } catch {
      if (demoDataEnabled) {
        setEsportsMatches(getDemoEsportMatches())
        setLastLiveSuccessAt(new Date())
      }
    }
  }, [demoDataEnabled])

  useEffect(() => {
    const shouldLoadEsports = tab === 'esport' || normalizeSessionSport(session?.sport) === 'cs2'
    if (!shouldLoadEsports) return
    void loadEsportsFeed()
    const id = window.setInterval(() => {
      void loadEsportsFeed()
    }, ESPORTS_POLL_MS)
    return () => window.clearInterval(id)
  }, [loadEsportsFeed, session?.sport, tab])

  useEffect(() => {
    if (location.hash !== '#welcome-bonus') return
    const element = bonusRef.current
    if (!element) return
    window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [location.hash])

  const selectedLiveMatches = useMemo(
    () => (tab === 'esport' ? esportsMatches : liveMatches),
    [esportsMatches, liveMatches, tab],
  )
  const selectedPopularMatches = useMemo(
    () => (tab === 'esport' ? esportsMatches.map(toPopularMatchCard) : popularMatches),
    [esportsMatches, popularMatches, tab],
  )
  const visibleLiveMatches = useMemo(
    () => (showAllLive ? selectedLiveMatches : selectedLiveMatches.slice(0, 2)),
    [selectedLiveMatches, showAllLive],
  )
  const hasAnyLiveMatches = liveMatches.length > 0 || esportsMatches.length > 0
  const showActiveSessionCard = false
  const visiblePopularMatches = useMemo(
    () => (showAllPopular ? selectedPopularMatches : selectedPopularMatches.slice(0, 2)),
    [selectedPopularMatches, showAllPopular],
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
    setStakeInput('500')
    setSelectedOdds(1)
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
    if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
      setError('Укажи сумму прогноза больше 0 ₽')
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
  }, [session, setPredictionStake, stakeValue])

  const statusText = useMemo(() => {
    if (!session) return 'Сейчас нет активной сессии'
    if (session.status === 'waiting') return 'Сессия создана, ждём открытия окна прогнозов'
    const createdAtMs = new Date(session.created_at).getTime()
    const leftMs =
      Number.isFinite(createdAtMs) && session.status === 'predicting'
        ? Math.max(0, createdAtMs + session.prediction_window_ms - nowMs)
        : null
    if (session.status === 'predicting' && leftMs === 0) {
      return 'Приём прогнозов завершён, ожидаем результат события'
    }
    if (session.status === 'predicting') return 'Окно прогнозов открыто'
    if (session.status === 'locked') return 'Приём прогнозов завершён, ожидаем результат события'
    return 'Сессия завершена, результаты готовы'
  }, [nowMs, session])

  const isSupportedSession = useMemo(() => {
    if (!session) return false
    const normalizedSport = normalizeSessionSport(session.sport)
    const normalizedEventType = normalizeEventType(session.event_type)
    return (
      SUPPORTED_SESSION_SPORTS.includes(normalizedSport as (typeof SUPPORTED_SESSION_SPORTS)[number]) &&
      normalizedEventType === SUPPORTED_EVENT_TYPE
    )
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
    if (leftMs === 0) return 'Время вышло'
    const mm = Math.floor(leftMs / 60_000)
    const ss = Math.floor((leftMs % 60_000) / 1000)
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }, [nowMs, session])

  const windowStatusLabel = useMemo(() => {
    if (!session) return '—'
    if (session.status !== 'predicting') return formatSessionStatusLabel(session.status)
    const createdAtMs = new Date(session.created_at).getTime()
    if (!Number.isFinite(createdAtMs)) return formatSessionStatusLabel(session.status)
    const leftMs = Math.max(0, createdAtMs + session.prediction_window_ms - nowMs)
    return leftMs === 0 ? 'Приём прогнозов завершён' : 'Окно открыто'
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

  const sessionMatchMeta = useMemo(() => parseSessionMatchMeta(session?.title), [session?.title])
  const normalizedSessionSport = useMemo(() => normalizeSessionSport(session?.sport), [session?.sport])
  const sessionLiveMatch = useMemo(() => {
    if (!sessionMatchMeta.homeTeam || !sessionMatchMeta.awayTeam) return null
    const source = [...liveMatches, ...esportsMatches]
    return (
      source.find(
        (match) =>
          teamsMatch(sessionMatchMeta.homeTeam, sessionMatchMeta.awayTeam, match.home_team, match.away_team),
      ) ?? null
    )
  }, [esportsMatches, liveMatches, sessionMatchMeta.awayTeam, sessionMatchMeta.homeTeam])
  const sessionScoreLabel = useMemo(() => {
    if (!sessionLiveMatch) return '— : —'
    return `${sessionLiveMatch.home_score ?? '—'} : ${sessionLiveMatch.away_score ?? '—'}`
  }, [sessionLiveMatch])
  const sessionLiveStatusLabel = useMemo(() => {
    if (!sessionLiveMatch) return 'Нет live-данных'
    return formatLiveStatusLabel(sessionLiveMatch.status_short, sessionLiveMatch.elapsed_minutes)
  }, [sessionLiveMatch])
  const predictionCardLabel = useMemo(() => {
    if (!prediction) return 'Не отправлен'
    if (prediction.score != null) return `${prediction.score} очков`
    return `Отправлен в ${new Date(prediction.predicted_at_ms).toLocaleTimeString()}`
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
        {showActiveSessionCard && hasAnyLiveMatches ? (
          <section className="rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#1c2036]">
          <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-white">Активная сессия</h2>
          <p className="mt-1 font-[family-name:var(--font-inter)] text-xs text-[#8b95b0]">{statusText}</p>
          {session ? (
            <article className="mt-3 flex flex-col overflow-hidden rounded-[14px] bg-[#141829] ring-1 ring-inset ring-[#1c2036]">
              <div className="flex flex-col gap-2.5 px-3.5 pb-2.5 pt-3.5">
                <div className="flex items-center gap-1.5">
                  {normalizedSessionSport === 'cs2' ? (
                    <Crosshair className="size-2.5 shrink-0 text-[#ef4444]" strokeWidth={2.5} />
                  ) : (
                    <Circle className="size-2.5 shrink-0 text-[#3b82f6]" strokeWidth={2.5} />
                  )}
                  <span className="font-[family-name:var(--font-inter)] text-[10px] font-medium leading-none text-[#4b5577]">
                    {sessionMatchMeta.league ?? 'Live матч'}
                  </span>
                </div>
                <div className="flex w-full min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div className="size-8 rounded-2xl bg-[#1c2036]" />
                    <span className="max-w-full text-center font-[family-name:var(--font-inter)] text-[10px] font-semibold leading-tight text-white break-words">
                      {sessionMatchMeta.homeTeam ?? 'Team A'}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <span className="font-[family-name:var(--font-sora)] text-xs font-bold text-[#4b5577]">VS</span>
                    <span className="font-[family-name:var(--font-inter)] text-[10px] font-medium leading-none text-[#8b95b0]">
                      {sessionMatchMeta.startTimeLabel ?? 'LIVE сейчас'}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div className="size-8 rounded-2xl bg-[#1c2036]" />
                    <span className="max-w-full text-center font-[family-name:var(--font-inter)] text-[10px] font-semibold leading-tight text-white break-words">
                      {sessionMatchMeta.awayTeam ?? 'Team B'}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ) : null}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-[#1c2036] p-2">
              <p className="text-[10px] text-[#8b95b0]">Счёт</p>
              <p className="text-sm font-semibold text-white">{sessionScoreLabel}</p>
            </div>
            <div className="rounded-lg bg-[#1c2036] p-2">
              <p className="text-[10px] text-[#8b95b0]">Статус матча</p>
              <p className="text-sm font-semibold text-white">{sessionLiveStatusLabel}</p>
            </div>
            <div className="rounded-lg bg-[#1c2036] p-2">
              <p className="text-[10px] text-[#8b95b0]">Твой прогноз</p>
              <p className="text-sm font-semibold text-white">{predictionCardLabel}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#8b95b0]">
            {session ? `Окно прогнозов: ${windowStatusLabel}` : 'Окно прогнозов: —'}
            {session ? ` · ${windowTimerLabel}` : ''}
          </p>
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
        ) : null}
        <SportTabs tabs={SPORT_TABS} activeId={tab} onChange={setTab} />
        <CategoryStrip items={CATEGORIES} />
        <section className="flex flex-col gap-3">
          <SectionHeader title="Популярные матчи" />
          <div className="flex flex-col gap-3">
            {selectedPopularMatches.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#8b95b0]">
                В данный момент нет матчей, пожалуйста подождите
              </p>
            ) : null}
            {visiblePopularMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                fullWidth
                onClick={typeof m.matchId === 'number' ? () => onOpenMatchWatch(m.matchId as number) : undefined}
              />
            ))}
            {selectedPopularMatches.length > 2 ? (
              <button
                type="button"
                onClick={() => setShowAllPopular((prev) => !prev)}
                className="h-10 rounded-xl bg-[#1c2036] font-[family-name:var(--font-inter)] text-sm font-semibold text-[#8b95b0]"
              >
                {showAllPopular ? 'Свернуть популярные' : `Все популярные (${selectedPopularMatches.length})`}
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
                  {selectedLiveMatches.length}
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
            {selectedLiveMatches.length > 2 ? (
              <button
                type="button"
                onClick={() => setShowAllLive((prev) => !prev)}
                className="h-10 rounded-xl bg-[#1c2036] font-[family-name:var(--font-inter)] text-sm font-semibold text-[#8b95b0]"
              >
                {showAllLive ? 'Свернуть Live' : `Все сейчас Live (${selectedLiveMatches.length})`}
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
