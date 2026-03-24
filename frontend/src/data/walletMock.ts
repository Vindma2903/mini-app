import type { WalletBalance, WalletPaymentMethod, WalletTransaction } from '../types/wallet'

export const MOCK_WALLET_BALANCE: WalletBalance = {
  primaryLabel: 'Доступный баланс',
  amountFormatted: '12 550',
  currency: '₽',
  fiatHint: '≈ $137.20',
}

export const MOCK_PAYMENT_METHODS: WalletPaymentMethod[] = [
  { id: 'crypto', name: 'Крипто', subtitle: 'USDT, BTC, ETH', variant: 'crypto' },
  { id: 'card', name: 'Карта', subtitle: 'Visa, Mastercard', variant: 'card' },
]

export const MOCK_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 't1',
    title: 'Пополнение',
    detail: 'Сегодня, 14:23 · USDT',
    amountLabel: '+5 000 ₽',
    category: 'deposit',
    status: 'completed',
  },
  {
    id: 't2',
    title: 'Выигрыш',
    detail: 'Вчера, 20:15 · Arsenal — Chelsea',
    amountLabel: '+1 850 ₽',
    category: 'win',
    status: 'completed',
  },
  {
    id: 't3',
    title: 'Ставка',
    detail: 'Вчера, 19:30 · NaVi — G2',
    amountLabel: '-1 000 ₽',
    category: 'bet',
    status: 'completed',
  },
  {
    id: 't4',
    title: 'Вывод',
    detail: '22 марта, 11:00 · Карта',
    amountLabel: '-3 000 ₽',
    category: 'withdrawal',
    status: 'completed',
  },
  {
    id: 't5',
    title: 'Пополнение',
    detail: '20 марта, 09:12 · Карта',
    amountLabel: '+2 000 ₽',
    category: 'deposit',
    status: 'pending',
  },
]
