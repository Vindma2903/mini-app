import type { LucideIcon } from 'lucide-react'

export interface ProfileUser {
  avatarLetter: string
  /** Отображаемое имя (имя и фамилия или ник) */
  displayName: string
  username: string
  /** Числовой ID для отображения */
  numericId: string
  isVip: boolean
}

export interface ProfileStat {
  id: string
  value: string
  label: string
  valueClassName: string
}

export type ProfileBetHistoryResult = 'win' | 'loss'

export interface ProfileBetHistoryItemModel {
  id: string
  title: string
  meta: string
  amountLabel: string
  resultLabel: string
  result: ProfileBetHistoryResult
}

export type ProfileMenuTrailing = 'chevron' | 'toggle'

export interface ProfileMenuItemModel {
  id: string
  label: string
  icon: LucideIcon
  iconClassName: string
  trailing: ProfileMenuTrailing
}
