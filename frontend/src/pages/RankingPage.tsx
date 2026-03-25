import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBar } from '../components/StatusBar'
import { buildDemoLeaderboard } from '../data/demoLeaderboard'
import { useAuth } from '../hooks/useAuth'
import { getActiveSession, getDailyLeaderboard, getGlobalLeaderboard, getSessionLeaderboard } from '../services/gameApi'
import { useSettingsStore } from '../stores/settingsStore'
import type { LeaderboardEntry } from '../types/game'

type RankingTab = 'daily' | 'global' | 'session'

function formatDelta(value: number | null): string {
  if (value == null) return '—'
  if (value < 1000) return `${value} мс`
  return `${(value / 1000).toFixed(2)} c`
}

export function RankingPage(): JSX.Element {
  const navigate = useNavigate()
  const { user } = useAuth()
  const demoDataEnabled = useSettingsStore((s) => s.demoDataEnabled)
  const [tab, setTab] = useState<RankingTab>('daily')
  const [daily, setDaily] = useState<LeaderboardEntry[]>([])
  const [global, setGlobal] = useState<LeaderboardEntry[]>([])
  const [session, setSession] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [dailyRes, globalRes, activeSession] = await Promise.all([
        getDailyLeaderboard(),
        getGlobalLeaderboard(),
        getActiveSession(),
      ])
      const demo = buildDemoLeaderboard(user)
      setDaily(demoDataEnabled && dailyRes.items.length === 0 ? demo : dailyRes.items)
      setGlobal(demoDataEnabled && globalRes.items.length === 0 ? demo : globalRes.items)
      if (activeSession) {
        const sessionRes = await getSessionLeaderboard(activeSession.id)
        setSession(demoDataEnabled && sessionRes.items.length === 0 ? demo : sessionRes.items)
      } else {
        setSession(demoDataEnabled ? demo : [])
      }
      setError(null)
    } catch (err) {
      if (demoDataEnabled) {
        const demo = buildDemoLeaderboard(user)
        setDaily(demo)
        setGlobal(demo)
        setSession(demo)
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить рейтинг')
      }
    } finally {
      setLoading(false)
    }
  }, [demoDataEnabled, user])

  useEffect(() => {
    void load()
  }, [load])

  const entries = useMemo(() => {
    if (tab === 'daily') return daily
    if (tab === 'global') return global
    return session
  }, [daily, global, session, tab])

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
          Рейтинг игроков
        </h1>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
        <section className="grid grid-cols-3 gap-2 rounded-xl bg-[#141829] p-2">
          <button
            type="button"
            onClick={() => setTab('daily')}
            className={`h-9 rounded-lg text-xs font-semibold ${tab === 'daily' ? 'bg-[#8b5cf6] text-white' : 'text-[#8b95b0]'}`}
          >
            За день
          </button>
          <button
            type="button"
            onClick={() => setTab('global')}
            className={`h-9 rounded-lg text-xs font-semibold ${tab === 'global' ? 'bg-[#8b5cf6] text-white' : 'text-[#8b95b0]'}`}
          >
            Общий
          </button>
          <button
            type="button"
            onClick={() => setTab('session')}
            className={`h-9 rounded-lg text-xs font-semibold ${tab === 'session' ? 'bg-[#8b5cf6] text-white' : 'text-[#8b95b0]'}`}
          >
            Сессия
          </button>
        </section>

        <section className="flex flex-col gap-2.5">
          {loading ? <p className="py-8 text-center text-sm text-[#8b95b0]">Загрузка...</p> : null}
          {!loading && error ? <p className="py-8 text-center text-sm text-red-400">{error}</p> : null}
          {!loading && !error && entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#8b95b0]">Пока нет данных для рейтинга</p>
          ) : null}
          {entries.map((item) => {
            const isMe = user?.id === item.user_id
            return (
              <article
                key={`${tab}-${item.user_id}-${item.rank}`}
                className={`rounded-xl p-3 ${isMe ? 'bg-[#8b5cf6]/20 ring-1 ring-inset ring-[#8b5cf6]/40' : 'bg-[#141829]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    #{item.rank} {item.username}
                    {isMe ? ' (Вы)' : ''}
                  </p>
                  <p className="text-sm font-bold text-[#22c55e]">{item.total_score}</p>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-2 text-[10px] text-[#8b95b0]">
                  <p>Прогнозов: {item.predictions_count}</p>
                  <p>Лучшая точность: {formatDelta(item.best_delta_ms)}</p>
                  <p>Средний score: {item.avg_score == null ? '—' : item.avg_score.toFixed(1)}</p>
                </div>
              </article>
            )
          })}
        </section>
      </main>
    </>
  )
}
