import type { LucideIcon } from 'lucide-react'
import { House, Radio, Ticket, User, Wallet } from 'lucide-react'
import { PATHS } from '../routes/paths'

export interface TabConfigItem {
  to: string
  label: string
  icon: LucideIcon
  /** `true` для корня `/`, чтобы не подсвечивать на вложенных путях */
  end?: boolean
}

export const TAB_ITEMS: TabConfigItem[] = [
  { to: PATHS.home, label: 'Главная', icon: House, end: true },
  { to: PATHS.live, label: 'Live', icon: Radio },
  { to: PATHS.bets, label: 'Ставки', icon: Ticket },
  { to: PATHS.wallet, label: 'Кошелёк', icon: Wallet },
  { to: PATHS.profile, label: 'Профиль', icon: User },
]
