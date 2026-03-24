import { useCallback, useMemo, useState } from 'react'
import { LiveCategoryTabs } from '../components/live/LiveCategoryTabs'
import { LiveMatchCard } from '../components/live/LiveMatchCard'
import { LiveScreenHeader } from '../components/live/LiveScreenHeader'
import { StatusBar } from '../components/StatusBar'
import { LIVE_CATEGORY_TABS, LIVE_MATCHES_MOCK } from '../data/liveMatches'
import type { LiveCategoryId } from '../types/live'

function filterMatches(category: LiveCategoryId) {
  if (category === 'all') return LIVE_MATCHES_MOCK
  if (category === 'football') {
    return LIVE_MATCHES_MOCK.filter((m) => m.id === 'pl-1' || m.id === 'lla-1')
  }
  return LIVE_MATCHES_MOCK.filter((m) => m.id === 'cs-1')
}

export function LivePage(): JSX.Element {
  const [category, setCategory] = useState<LiveCategoryId>('all')

  const matches = useMemo(() => filterMatches(category), [category])
  const liveCount = LIVE_MATCHES_MOCK.length

  const onSearchClick = useCallback(() => {
    // заготовка под поиск в мини-приложении
  }, [])

  const onFilterClick = useCallback(() => {
    // заготовка под фильтры
  }, [])

  return (
    <>
      <StatusBar />
      <LiveScreenHeader liveCount={liveCount} onSearchClick={onSearchClick} onFilterClick={onFilterClick} />
      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
        <LiveCategoryTabs tabs={LIVE_CATEGORY_TABS} activeId={category} onChange={setCategory} />
        <section className="flex flex-col gap-2.5" aria-label="Трансляции и live-матчи">
          {matches.map((match) => (
            <LiveMatchCard key={match.id} match={match} />
          ))}
        </section>
      </main>
    </>
  )
}
