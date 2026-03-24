import { Loader2, Send } from 'lucide-react'

export interface TelegramLoginButtonProps {
  loading?: boolean
  disabled?: boolean
  onClick: () => void
}

export function TelegramLoginButton({ loading, disabled, onClick }: TelegramLoginButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] font-[family-name:var(--font-inter)] text-base font-bold text-[#0a0e1a] shadow-[0_4px_20px_rgba(251,191,36,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-[22px] shrink-0 animate-spin" aria-hidden />
      ) : (
        <Send className="size-[22px] shrink-0" strokeWidth={2.25} aria-hidden />
      )}
      Войти через Telegram
    </button>
  )
}
