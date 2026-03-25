import { useCallback, useId, useMemo, useState } from 'react'
import { Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PATHS } from '../routes/paths'
import { ProfileBetHistory } from '../components/profile/ProfileBetHistory'
import { ProfileLogoutButton } from '../components/profile/ProfileLogoutButton'
import { ProfileMenu } from '../components/profile/ProfileMenu'
import { ProfilePageHeader } from '../components/profile/ProfilePageHeader'
import { ProfileStats } from '../components/profile/ProfileStats'
import { ProfileMenuToggle } from '../components/profile/ProfileMenuToggle'
import { UserInfo } from '../components/profile/UserInfo'
import { StatusBar } from '../components/StatusBar'
import { MOCK_PROFILE_MENU } from '../data/profileMock'
import { useAuthStore } from '../stores/authStore'
import { useGameWalletStore } from '../stores/gameWalletStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { ProfileBetHistoryItemModel, ProfileStat } from '../types/profile'

export function ProfilePage(): JSX.Element {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const balance = useGameWalletStore((s) => s.balance)
  const bets = useGameWalletStore((s) => s.bets)
  const transactions = useGameWalletStore((s) => s.transactions)
  const setUser = useAuthStore((s) => s.setUser)
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled)
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled)
  const demoDataEnabled = useSettingsStore((s) => s.demoDataEnabled)
  const setDemoDataEnabled = useSettingsStore((s) => s.setDemoDataEnabled)
  const demoToggleLabelId = useId()
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [editProfileError, setEditProfileError] = useState<string | null>(null)

  const onSettings = useCallback(() => {
    // экран настроек / API
  }, [])

  const onEditProfile = useCallback(() => {
    setDisplayNameInput(user?.display_name ?? '')
    setEditProfileError(null)
    setShowEditProfileModal(true)
  }, [user?.display_name])

  const onCancelEditProfile = useCallback(() => {
    setShowEditProfileModal(false)
    setEditProfileError(null)
  }, [])

  const onSaveEditProfile = useCallback(() => {
    if (!user) return
    const nextDisplayName = displayNameInput.trim()
    if (nextDisplayName.length < 2) {
      setEditProfileError('Имя должно быть не короче 2 символов')
      return
    }
    if (nextDisplayName.length > 40) {
      setEditProfileError('Имя должно быть не длиннее 40 символов')
      return
    }
    setUser({ ...user, display_name: nextDisplayName })
    setShowEditProfileModal(false)
    setEditProfileError(null)
  }, [displayNameInput, setUser, user])

  const onMenuItem = useCallback((id: string) => {
    if (id === 'bonuses') {
      navigate(`${PATHS.home}#welcome-bonus`)
      return
    }
    if (id === 'support') {
      navigate(PATHS.profileSupport)
      return
    }
    if (id === 'security') {
      setShowSecurityModal(true)
    }
  }, [navigate])

  const onBetHistoryAll = useCallback(() => {
    navigate(PATHS.bets)
  }, [navigate])

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

  const profileStats = useMemo<ProfileStat[]>(() => {
    const resolved = bets.filter((bet) => bet.status !== 'open')
    const won = resolved.filter((bet) => bet.status === 'won')
    const hitRate = resolved.length > 0 ? Math.round((won.length / resolved.length) * 100) : null

    return [
      {
        id: 'bal',
        value: `${new Intl.NumberFormat('ru-RU').format(balance)} ₽`,
        label: 'Баланс',
        valueClassName: 'text-white',
      },
      {
        id: 'bets',
        value: new Intl.NumberFormat('ru-RU').format(bets.length),
        label: 'Ставок',
        valueClassName: 'text-[#8b5cf6]',
      },
      {
        id: 'hit-rate',
        value: hitRate == null ? '—' : `${hitRate}%`,
        label: 'Процент захода',
        valueClassName: hitRate == null ? 'text-[#8b95b0]' : 'text-[#22c55e]',
      },
    ]
  }, [balance, bets])

  const profileHistory = useMemo<ProfileBetHistoryItemModel[]>(() => {
    return transactions.slice(0, 5).map((tx) => {
      const result: ProfileBetHistoryItemModel['result'] =
        tx.category === 'win' ? 'win' : tx.category === 'withdrawal' ? 'loss' : 'neutral'

      return {
        id: tx.id,
        title: tx.title,
        meta: tx.detail,
        amountLabel: tx.amountLabel,
        resultLabel:
          tx.category === 'win'
            ? 'Выигрыш'
            : tx.category === 'bet'
              ? 'Ставка'
              : tx.category === 'deposit'
                ? 'Пополнение'
                : 'Вывод',
        result,
      }
    })
  }, [transactions])

  return (
    <>
      <StatusBar />
      <ProfilePageHeader onSettingsClick={onSettings} />
      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
        {profileUser ? <UserInfo user={profileUser} onEditClick={onEditProfile} /> : null}
        <ProfileStats stats={profileStats} />
        <ProfileBetHistory items={profileHistory} onSeeAll={onBetHistoryAll} />
        <ProfileMenu
          items={MOCK_PROFILE_MENU}
          notificationsOn={notificationsEnabled}
          onNotificationsChange={setNotificationsEnabled}
          onItemClick={onMenuItem}
        />
        <section className="rounded-[14px] bg-[#141829] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p id={demoToggleLabelId} className="font-[family-name:var(--font-inter)] text-sm font-medium text-white">
                Демо-данные матчей
              </p>
              <p className="mt-1 text-xs text-[#8b95b0]">
                Если live API пустой, показывать тестовые матчи для демонстрации
              </p>
            </div>
            <ProfileMenuToggle
              pressed={demoDataEnabled}
              onChange={setDemoDataEnabled}
              labelledBy={demoToggleLabelId}
            />
          </div>
        </section>
        <ProfileLogoutButton onClick={onLogout} />
      </main>
      {showSecurityModal ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#02040bcc]/80 p-4">
          <div className="w-full max-w-[393px] rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#2a2f48]">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#8b5cf6]/20 text-[#8b5cf6]">
                <Shield className="size-4" strokeWidth={2.25} aria-hidden />
              </div>
              <h3 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">Безопасность аккаунта</h3>
            </div>
            <p className="mt-1 text-xs text-[#8b95b0]">Проверьте данные вашего аккаунта</p>

            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[#1c2036] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#8b95b0]">Email</span>
                <span className="text-sm font-semibold text-white">{user?.email ?? '—'}</span>
              </div>
              <div className="h-px bg-[#2a2f48]" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#8b95b0]">ID</span>
                <span className="text-sm font-semibold text-white">{user?.id ?? '—'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSecurityModal(false)}
              className="mt-3 h-10 w-full rounded-lg bg-[#0f1322] text-sm font-medium text-[#8b95b0]"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}
      {showEditProfileModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#02040bcc]/80 p-4">
          <div className="w-full max-w-[393px] rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#2a2f48]">
            <h3 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">Редактировать профиль</h3>
            <p className="mt-1 text-xs text-[#8b95b0]">Измените отображаемое имя</p>

            <div className="mt-3 rounded-xl bg-[#1c2036] p-3">
              <p className="text-[10px] text-[#8b95b0]">Имя</p>
              <input
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                maxLength={40}
                placeholder="Введите имя"
                className="mt-1 h-10 w-full rounded-lg bg-[#0f1322] px-3 text-sm font-semibold text-white outline-none ring-1 ring-inset ring-[#2a2f48] focus:ring-[#8b5cf6]"
              />
            </div>

            {editProfileError ? <p className="mt-2 text-xs text-red-400">{editProfileError}</p> : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCancelEditProfile}
                className="h-10 rounded-lg bg-[#0f1322] text-sm font-medium text-[#8b95b0]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onSaveEditProfile}
                className="h-10 rounded-lg bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-sm font-bold text-[#04120a]"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
