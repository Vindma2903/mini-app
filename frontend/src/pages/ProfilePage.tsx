import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PATHS } from '../routes/paths'
import { ProfileBetHistory } from '../components/profile/ProfileBetHistory'
import { ProfileLogoutButton } from '../components/profile/ProfileLogoutButton'
import { ProfileMenu } from '../components/profile/ProfileMenu'
import { ProfilePageHeader } from '../components/profile/ProfilePageHeader'
import { ProfileStats } from '../components/profile/ProfileStats'
import { UserInfo } from '../components/profile/UserInfo'
import { StatusBar } from '../components/StatusBar'
import {
  MOCK_PROFILE_BET_HISTORY,
  MOCK_PROFILE_MENU,
  MOCK_PROFILE_STATS,
} from '../data/profileMock'

export function ProfilePage(): JSX.Element {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const onSettings = useCallback(() => {
    // экран настроек / API
  }, [])

  const onEditProfile = useCallback(() => {
    // редактирование профиля
  }, [])

  const onMenuItem = useCallback((id: string) => {
    void id
    // навигация по пунктам меню
  }, [])

  const onBetHistoryAll = useCallback(() => {
    // полная история ставок
  }, [])

  const onLogout = useCallback(() => {
    logout()
    navigate(PATHS.auth, { replace: true })
  }, [logout, navigate])

  const profileUser = user
    ? {
        avatarLetter: user.display_name.slice(0, 1).toUpperCase() || user.email.slice(0, 1).toUpperCase(),
        displayName: user.display_name,
        username: user.username,
        numericId: String(user.id),
        isVip: user.is_vip,
      }
    : null

  return (
    <>
      <StatusBar />
      <ProfilePageHeader onSettingsClick={onSettings} />
      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
        {profileUser ? <UserInfo user={profileUser} onEditClick={onEditProfile} /> : null}
        <ProfileStats stats={MOCK_PROFILE_STATS} />
        <ProfileBetHistory items={MOCK_PROFILE_BET_HISTORY} onSeeAll={onBetHistoryAll} />
        <ProfileMenu items={MOCK_PROFILE_MENU} onItemClick={onMenuItem} />
        <ProfileLogoutButton onClick={onLogout} />
      </main>
    </>
  )
}
