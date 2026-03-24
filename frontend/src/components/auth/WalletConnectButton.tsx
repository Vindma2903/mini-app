import { Loader2, Wallet } from 'lucide-react'

export interface WalletConnectButtonProps {
  loading?: boolean
  disabled?: boolean
  onClick: () => void
}

export function WalletConnectButton({ loading, disabled, onClick }: WalletConnectButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#141829] font-[family-name:var(--font-inter)] text-[15px] font-semibold text-white ring-1 ring-inset ring-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-5 shrink-0 animate-spin text-[#8b5cf6]" aria-hidden />
      ) : (
        <Wallet className="size-5 shrink-0 text-[#8b5cf6]" strokeWidth={2.25} aria-hidden />
      )}
      Подключить кошелёк
    </button>
  )
}
