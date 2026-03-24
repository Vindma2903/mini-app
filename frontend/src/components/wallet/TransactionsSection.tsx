import { useMemo, useState } from 'react'
import { filterWalletTransactions } from '../../utils/filterWalletTransactions'
import type { WalletTransaction, WalletTransactionFilter } from '../../types/wallet'
import { TransactionFilters } from './TransactionFilters'
import { TransactionList } from './TransactionList'

export interface TransactionsSectionProps {
  transactions: WalletTransaction[]
  onSeeAll?: () => void
}

export function TransactionsSection({ transactions, onSeeAll }: TransactionsSectionProps): JSX.Element {
  const [filter, setFilter] = useState<WalletTransactionFilter>('all')
  const visible = useMemo(() => filterWalletTransactions(transactions, filter), [transactions, filter])

  return (
    <section className="flex flex-col gap-3" aria-label="История операций">
      <div className="flex w-full items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">История операций</h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="shrink-0 font-[family-name:var(--font-inter)] text-xs font-medium text-[#8b5cf6]"
        >
          Все
        </button>
      </div>
      <TransactionFilters active={filter} onChange={setFilter} />
      <TransactionList transactions={visible} />
    </section>
  )
}
