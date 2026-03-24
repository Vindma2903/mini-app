import { useCallback, useMemo, useState } from 'react'
import { BetCard } from '../components/bets/BetCard'
import { BetsFilterTabs } from '../components/bets/BetsFilterTabs'
import { BetsPageHeader } from '../components/bets/BetsPageHeader'
import { BetsSlipSummary } from '../components/bets/BetsSlipSummary'
import { StatusBar } from '../components/StatusBar'
import { MOCK_ACTIVE_TOTALS, MOCK_BETS, filterBetsByTab } from '../data/betsMock'
import type { BetListTab, BetRecord } from '../types/bets'

export function BetsPage(): JSX.Element {
  const [tab, setTab] = useState<BetListTab>('active')
  const [bets, setBets] = useState<BetRecord[]>(MOCK_BETS)

  const visible = useMemo(() => filterBetsByTab(bets, tab), [bets, tab])
  const headerCount = visible.length

  const onClear = useCallback(() => {
    setBets((prev) => prev.filter((b) => b.outcome !== 'active'))
  }, [])

  const onPlaceBet = useCallback(() => {
    // интеграция с оплатой / API
  }, [])

  return (
    <>
      <StatusBar />
      <BetsPageHeader tab={tab} count={headerCount} onClear={tab === 'active' ? onClear : undefined} />
      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
        <BetsFilterTabs active={tab} onChange={setTab} />

        <section className="flex flex-col gap-2.5" aria-label="Список ставок">
          {visible.length === 0 ? (
            <p className="py-8 text-center font-[family-name:var(--font-inter)] text-sm text-[#8b95b0]">
              {tab === 'active' ? 'Нет активных ставок' : 'Нет завершённых ставок'}
            </p>
          ) : (
            visible.map((bet) => <BetCard key={bet.id} bet={bet} />)
          )}
        </section>

        {tab === 'active' && visible.length > 0 ? (
          <BetsSlipSummary totals={MOCK_ACTIVE_TOTALS} onPlaceBet={onPlaceBet} />
        ) : null}
      </main>
    </>
  )
}
