import { Bell, Gift, LifeBuoy, Shield } from 'lucide-react'
import type {
  ProfileBetHistoryItemModel,
  ProfileMenuItemModel,
  ProfileStat,
  ProfileUser,
} from '../types/profile'

export const MOCK_PROFILE_USER: ProfileUser = {
  avatarLetter: 'P',
  displayName: 'Алексей К.',
  username: '@player123',
  numericId: '8429571',
  isVip: true,
}

export const MOCK_PROFILE_STATS: ProfileStat[] = [
  { id: 'bal', value: '12 550 ₽', label: 'Баланс', valueClassName: 'text-white' },
  { id: 'bets', value: '47', label: 'Ставок', valueClassName: 'text-[#8b5cf6]' },
  { id: 'wr', value: '68%', label: 'Винрейт', valueClassName: 'text-[#22c55e]' },
]

export const MOCK_PROFILE_BET_HISTORY: ProfileBetHistoryItemModel[] = [
  {
    id: 'bh1',
    title: 'Arsenal — Chelsea · П1',
    meta: 'Вчера · Коэфф. 1.85',
    amountLabel: '+925 ₽',
    resultLabel: 'Выигрыш',
    result: 'win',
  },
  {
    id: 'bh2',
    title: 'NaVi — FaZe · П2',
    meta: '22 марта · Коэфф. 2.40',
    amountLabel: '-500 ₽',
    resultLabel: 'Проигрыш',
    result: 'loss',
  },
  {
    id: 'bh3',
    title: 'Barcelona — Real · Ничья',
    meta: '21 марта · Коэфф. 3.20',
    amountLabel: '+1 600 ₽',
    resultLabel: 'Выигрыш',
    result: 'win',
  },
]

export const MOCK_PROFILE_MENU: ProfileMenuItemModel[] = [
  { id: 'bonuses', label: 'Бонусы и акции', icon: Gift, iconClassName: 'text-[#fbbf24]', trailing: 'chevron' },
  { id: 'notifications', label: 'Уведомления', icon: Bell, iconClassName: 'text-[#3b82f6]', trailing: 'toggle' },
  { id: 'security', label: 'Безопасность', icon: Shield, iconClassName: 'text-[#8b5cf6]', trailing: 'chevron' },
  { id: 'support', label: 'Поддержка', icon: LifeBuoy, iconClassName: 'text-[#8b95b0]', trailing: 'chevron' },
]
