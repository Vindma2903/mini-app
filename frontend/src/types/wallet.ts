/** Категория операции для фильтров и отображения */
export type WalletTransactionCategory = 'deposit' | 'withdrawal' | 'bet' | 'win'

export type WalletTransactionFilter = 'all' | 'deposit' | 'withdrawal' | 'bets'

export type WalletTransactionStatus = 'completed' | 'pending' | 'failed'

export interface WalletTransaction {
  id: string
  title: string
  /** Подзаголовок: дата, способ, матч */
  detail: string
  /** Уже отформатированная сумма со знаком, напр. "+5 000 ₽" */
  amountLabel: string
  category: WalletTransactionCategory
  status: WalletTransactionStatus
}

export interface WalletBalance {
  primaryLabel: string
  amountFormatted: string
  currency: string
  fiatHint: string
}

export interface WalletPaymentMethod {
  id: string
  name: string
  subtitle: string
  variant: 'crypto' | 'card'
}
