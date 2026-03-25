import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LiveCategoryTabs } from '../components/live/LiveCategoryTabs'
import { LiveMatchCard } from '../components/live/LiveMatchCard'
import { LiveScreenHeader } from '../components/live/LiveScreenHeader'
import { StatusBar } from '../components/StatusBar'
import { getDemoEsportMatches, getDemoFootballMatches } from '../data/demoLiveMatches'
import { LIVE_CATEGORY_TABS } from '../data/liveMatches'
import { PATHS } from '../routes/paths'
import { getEsportsMatches, getLiveMatches } from '../services/gameApi'
import { useSettingsStore } from '../stores/settingsStore'
import type { LiveMatch } from '../types/game'
import type { LiveCategoryId, LiveMatchCardModel, LiveStatusTone } from '../types/live'

const FOOTBALL_POLL_INTERVAL_MS = 10_000
const ESPORTS_POLL_INTERVAL_MS = 20_000
const DISPLAY_TIME_ZONE = 'Europe/Moscow'
const DISPLAY_TIME_ZONE_LABEL = 'МСК'

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

function formatUpdateTime(value: Date | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)
}

function getStatusMeta(statusShort: string | null): string {
  switch (statusShort) {
    case 'HT':
      return 'Перерыв'
    case '1H':
      return '1-й тайм'
    case '2H':
      return '2-й тайм'
    case 'FT':
      return 'Матч завершен'
    case 'ET':
      return 'Доп. время'
    case 'PEN':
      return 'Серия пенальти'
    default:
      return 'В прямом эфире'
  }
}

function getTimer(statusShort: string | null, elapsedMinutes: number | null): string {
  if (elapsedMinutes != null && ['1H', '2H', 'ET'].includes(statusShort ?? '')) {
    return `${elapsedMinutes}'`
  }
  return statusShort ?? 'LIVE'
}

function getStartedAtLabel(startedAt: string | null): string | undefined {
  if (!startedAt) return undefined
  const date = new Date(startedAt)
  if (Number.isNaN(date.getTime())) return undefined
  const localTime = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date)
  return `Старт ${localTime} ${DISPLAY_TIME_ZONE_LABEL}`
}

function getScorePart(value: number | null): string {
  return value == null ? '—' : String(value)
}

function getStatusBadge(
  statusShort: string | null,
): {
  label: string
  tone: LiveStatusTone
} {
  if (statusShort === 'HT') return { label: 'HT', tone: 'yellow' }
  if (statusShort === 'FT') return { label: 'FT', tone: 'gray' }
  if (statusShort === 'PEN') return { label: 'PEN', tone: 'orange' }
  return { label: 'LIVE', tone: 'red' }
}

function mapMatchToLiveCard(match: LiveMatch): LiveMatchCardModel {
  const demoMeta = getDemoCountdownLabel(match)
  return {
    id: String(match.provider_match_id),
    league: match.league,
    leagueMark: { type: 'dot', tone: 'blue' },
    timer: getTimer(match.status_short, match.elapsed_minutes),
    teamLeft: { name: match.home_team },
    teamRight: { name: match.away_team },
    score: `${getScorePart(match.home_score)} : ${getScorePart(match.away_score)}`,
    meta: demoMeta ?? getStatusMeta(match.status_short),
    startedAtLabel: getStartedAtLabel(match.started_at),
    statusBadge: getStatusBadge(match.status_short),
  }
}

function mapEsportsToLiveCard(match: LiveMatch): LiveMatchCardModel {
  const demoMeta = getDemoCountdownLabel(match)
  return {
    id: String(match.provider_match_id),
    league: match.league,
    leagueMark: { type: 'esports' },
    timer: getTimer(match.status_short, match.elapsed_minutes),
    teamLeft: { name: match.home_team },
    teamRight: { name: match.away_team },
    score: `${getScorePart(match.home_score)} : ${getScorePart(match.away_score)}`,
    meta: demoMeta ?? getStatusMeta(match.status_short),
    startedAtLabel: getStartedAtLabel(match.started_at),
    statusBadge: getStatusBadge(match.status_short),
  }
}

export function LivePage(): JSX.Element {
  const navigate = useNavigate()
  const demoDataEnabled = useSettingsStore((s) => s.demoDataEnabled)
  const [category, setCategory] = useState<LiveCategoryId>('all')
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [esportsMatches, setEsportsMatches] = useState<LiveMatch[]>([])
  const [lastLiveSuccessAt, setLastLiveSuccessAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFootball = useCallback(async () => {
    try {
      const live = await getLiveMatches()
      if (live.length > 0) {
        setMatches(live)
        setLastLiveSuccessAt(new Date())
      } else if (demoDataEnabled) {
        setMatches(getDemoFootballMatches())
        setLastLiveSuccessAt(new Date())
      } else {
        setMatches([])
      }
      setError(null)
    } catch (err) {
      if (demoDataEnabled) {
        setMatches(getDemoFootballMatches())
        setLastLiveSuccessAt(new Date())
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить live-данные')
      }
    } finally {
      setLoading(false)
    }
  }, [demoDataEnabled])

  const loadEsports = useCallback(async () => {
    try {
      const esports = await getEsportsMatches()
      if (esports.length > 0) {
        setEsportsMatches(esports)
        setLastLiveSuccessAt(new Date())
      } else if (demoDataEnabled) {
        setEsportsMatches(getDemoEsportMatches())
        setLastLiveSuccessAt(new Date())
      } else {
        setEsportsMatches([])
      }
      setError(null)
    } catch (err) {
      if (demoDataEnabled) {
        setEsportsMatches(getDemoEsportMatches())
        setLastLiveSuccessAt(new Date())
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить live-данные')
      }
    } finally {
      setLoading(false)
    }
  }, [demoDataEnabled])

  useEffect(() => {
    void loadFootball()
    const id = window.setInterval(() => {
      void loadFootball()
    }, FOOTBALL_POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [loadFootball])

  useEffect(() => {
    if (category === 'football') return
    void loadEsports()
    const id = window.setInterval(() => {
      void loadEsports()
    }, ESPORTS_POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [category, loadEsports])

  const cards = useMemo(() => {
    const footballCards = matches.map(mapMatchToLiveCard)
    const esportsCards = esportsMatches.map(mapEsportsToLiveCard)
    if (category === 'football') return footballCards
    if (category === 'esports') return esportsCards
    return [...footballCards, ...esportsCards]
  }, [category, esportsMatches, matches])

  const liveCount = cards.length

  const onSearchClick = useCallback(() => {
    // TODO: подключить поиск по матчам после интеграции внешних источников.
  }, [])

  const onFilterClick = useCallback(() => {
    // TODO: подключить фильтры после появления списка матчей.
  }, [])

  return (
    <>
      <StatusBar />
      <LiveScreenHeader liveCount={liveCount} onSearchClick={onSearchClick} onFilterClick={onFilterClick} />
      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
        <LiveCategoryTabs tabs={LIVE_CATEGORY_TABS} activeId={category} onChange={setCategory} />
        <p className="text-xs text-[#8b95b0]">Последнее успешное обновление: {formatUpdateTime(lastLiveSuccessAt)}</p>
        <section className="flex flex-col gap-2.5" aria-label="Трансляции и live-матчи">
          {loading ? <p className="py-8 text-center text-sm text-[#8b95b0]">Загрузка...</p> : null}
          {!loading && error ? <p className="py-8 text-center text-sm text-red-400">{error}</p> : null}
          {!loading && !error && cards.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#8b95b0]">Сейчас live-матчей нет у провайдера</p>
          ) : null}
          {cards.map((match) => (
            <LiveMatchCard key={match.id} match={match} onClick={() => navigate(`${PATHS.watch}/${match.id}`)} />
          ))}
        </section>
      </main>
    </>
  )
}
