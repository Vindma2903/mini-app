import type { WalletTransaction, WalletTransactionFilter } from '../types/wallet'

export function filterWalletTransactions(
  items: WalletTransaction[],
  filter: WalletTransactionFilter,
): WalletTransaction[] {
  if (filter === 'all') return items
  if (filter === 'deposit') return items.filter((x) => x.category === 'deposit')
  if (filter === 'withdrawal') return items.filter((x) => x.category === 'withdrawal')
  return items.filter((x) => x.category === 'bet' || x.category === 'win')
}
