import { useCallback, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AuthBranding } from '../components/auth/AuthBranding'
import { AuthFooter } from '../components/auth/AuthFooter'
import { AuthForm } from '../components/auth/AuthForm'
import { GuestContinueLink } from '../components/auth/GuestContinueLink'
import { TelegramLoginButton } from '../components/auth/TelegramLoginButton'
import { WalletConnectButton } from '../components/auth/WalletConnectButton'
import { StatusBar } from '../components/StatusBar'
import { useAuth } from '../hooks/useAuth'
import { PATHS } from '../routes/paths'
import { connectWalletMock, loginWithCredentials, loginWithTelegram } from '../services/authApi'
import type { AuthCredentials, AuthUser } from '../types/auth'

export function AuthPage(): JSX.Element {
  const navigate = useNavigate()
  const { isAuthed, isLoading, login } = useAuth()
  const [tgLoading, setTgLoading] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [tgError, setTgError] = useState<string | null>(null)

  const goHome = useCallback((token?: string | null, user?: AuthUser) => {
    if (token && user) {
      login(token, user)
    } else if (user) {
      login(null, user)
    }
    navigate(PATHS.home, { replace: true })
  }, [login, navigate])

  const onTelegram = useCallback(async () => {
    setTgLoading(true)
    setTgError(null)
    try {
      const result = await loginWithTelegram()
      goHome(result.access_token, result.user)
    } catch (err) {
      setTgError(err instanceof Error ? err.message : 'Ошибка входа через Telegram')
    } finally {
      setTgLoading(false)
    }
  }, [goHome])

  const onWallet = useCallback(async () => {
    setWalletLoading(true)
    try {
      await connectWalletMock()
      // здесь — редирект в Web3 / экран привязки кошелька
    } finally {
      setWalletLoading(false)
    }
  }, [])

  const onGuest = useCallback(() => {
    goHome(null, {
      id: -1,
      email: 'guest@example.com',
      display_name: 'Guest',
      username: '@guest',
      is_vip: false,
      created_at: new Date().toISOString(),
    })
  }, [goHome])

  const onEmailLogin = useCallback(
    async (c: AuthCredentials) => {
      const result = await loginWithCredentials(c)
      goHome(result.access_token, result.user)
    },
    [goHome],
  )

  if (isLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0e1a] text-white">Loading...</div>
  }

  if (isAuthed) {
    return <Navigate to={PATHS.home} replace />
  }

  const busy = tgLoading || walletLoading || formBusy

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[393px] flex-col overflow-x-hidden bg-[#0a0e1a] text-white">
      <div
        className="pointer-events-none absolute left-1/4 top-20 size-[200px] -translate-x-1/2 rounded-full bg-[#8b5cf6]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-36 size-[180px] rounded-full bg-[#3b82f6]/10 blur-3xl"
        aria-hidden
      />

      <StatusBar />

      <main className="flex flex-1 flex-col justify-center px-8 py-6">
        <div className="flex flex-col gap-8">
          <AuthBranding />

          <section className="flex flex-col gap-3" aria-label="Способы входа">
            <TelegramLoginButton loading={tgLoading} disabled={busy} onClick={onTelegram} />
            {tgError && (
              <p className="text-center text-sm text-red-400">{tgError}</p>
            )}
            <WalletConnectButton loading={walletLoading} disabled={busy} onClick={onWallet} />
            <div className="h-px w-full bg-[#1c2036]" aria-hidden />
            <AuthForm
              onSubmitCredentials={onEmailLogin}
              disabled={busy}
              onBusyChange={setFormBusy}
            />
            <GuestContinueLink onClick={onGuest} disabled={busy} />
          </section>
        </div>
      </main>

      <AuthFooter />
    </div>
  )
}
