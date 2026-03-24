import type { WalletTransaction } from '../../types/wallet'
import { TransactionItem } from './TransactionItem'

export interface TransactionListProps {
  transactions: WalletTransaction[]
}

export function TransactionList({ transactions }: TransactionListProps): JSX.Element {
  if (transactions.length === 0) {
    return (
      <p className="py-6 text-center font-[family-name:var(--font-inter)] text-sm text-[#8b95b0]">
        Нет операций по выбранному фильтру
      </p>
    )
  }

  return (
    <ul className="flex list-none flex-col gap-1 p-0" aria-label="Список операций">
      {transactions.map((tx) => (
        <li key={tx.id}>
          <TransactionItem transaction={tx} />
        </li>
      ))}
    </ul>
  )
}
