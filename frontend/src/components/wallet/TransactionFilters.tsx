import type { WalletTransactionFilter } from '../../types/wallet'

const FILTERS: { id: WalletTransactionFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'deposit', label: 'Пополнения' },
  { id: 'withdrawal', label: 'Выводы' },
  { id: 'bets', label: 'Ставки' },
]

export interface TransactionFiltersProps {
  active: WalletTransactionFilter
  onChange: (f: WalletTransactionFilter) => void
}

export function TransactionFilters({ active, onChange }: TransactionFiltersProps): JSX.Element {
  return (
    <div className="flex w-full flex-wrap gap-2" role="group" aria-label="Фильтр операций">
      {FILTERS.map(({ id, label }) => {
        const on = id === active
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(id)}
            className={`rounded-lg px-3 py-1.5 font-[family-name:var(--font-inter)] text-[11px] ${
              on
                ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] font-semibold text-white'
                : 'bg-[#141829] font-medium text-[#4b5577]'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
