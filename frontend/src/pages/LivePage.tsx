import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LiveCategoryTabs } from '../components/live/LiveCategoryTabs'
import { LiveMatchCard } from '../components/live/LiveMatchCard'
import { LiveScreenHeader } from '../components/live/LiveScreenHeader'
import { StatusBar } from '../components/StatusBar'
import { LIVE_CATEGORY_TABS } from '../data/liveMatches'
import { PATHS } from '../routes/paths'
import { getLiveMatches } from '../services/gameApi'
import type { LiveMatch } from '../types/game'
import type { LiveCategoryId, LiveMatchCardModel, LiveStatusTone } from '../types/live'

const LIVE_POLL_INTERVAL_MS = 10_000

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
  }).format(date)
  return `Старт ${localTime}`
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
  return {
    id: String(match.provider_match_id),
    league: match.league,
    leagueMark: { type: 'dot', tone: 'blue' },
    timer: getTimer(match.status_short, match.elapsed_minutes),
    teamLeft: { name: match.home_team },
    teamRight: { name: match.away_team },
    score: `${getScorePart(match.home_score)} : ${getScorePart(match.away_score)}`,
    meta: getStatusMeta(match.status_short),
    startedAtLabel: getStartedAtLabel(match.started_at),
    statusBadge: getStatusBadge(match.status_short),
  }
}

export function LivePage(): JSX.Element {
  const navigate = useNavigate()
  const [category, setCategory] = useState<LiveCategoryId>('all')
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [lastLiveSuccessAt, setLastLiveSuccessAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const live = await getLiveMatches()
      setMatches(live)
      if (live.length > 0) {
        setLastLiveSuccessAt(new Date())
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить live-данные')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => {
      void load()
    }, LIVE_POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [load])

  const cards = useMemo(() => {
    const footballCards = matches.map(mapMatchToLiveCard)
    if (category === 'all' || category === 'football') return footballCards
    return []
  }, [category, matches])

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
