import type { BetListTab } from '../../types/bets'

const TABS: { id: BetListTab; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'won', label: 'Выигрыш' },
  { id: 'lost', label: 'Проигрыш' },
]

export interface BetsFilterTabsProps {
  active: BetListTab
  onChange: (tab: BetListTab) => void
}

export function BetsFilterTabs({ active, onChange }: BetsFilterTabsProps): JSX.Element {
  return (
    <div
      className="grid h-10 w-full shrink-0 grid-cols-4 gap-0 rounded-xl bg-[#141829] p-1"
      role="tablist"
      aria-label="Фильтр ставок"
    >
      {TABS.map((t) => {
        const isOn = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isOn}
            onClick={() => onChange(t.id)}
            className={`flex flex-1 items-center justify-center rounded-[10px] text-[13px] transition-colors ${
              isOn
                ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] font-semibold text-white'
                : 'font-medium text-[#4b5577]'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
