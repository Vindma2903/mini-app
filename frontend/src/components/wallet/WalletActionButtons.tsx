import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

export interface WalletActionButtonsProps {
  onDeposit?: () => void
  onWithdraw?: () => void
}

export function WalletActionButtons({ onDeposit, onWithdraw }: WalletActionButtonsProps): JSX.Element {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <button
        type="button"
        onClick={onDeposit}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] font-[family-name:var(--font-inter)] text-sm font-bold text-[#0a0e1a]"
      >
        <ArrowDownToLine className="size-[18px]" strokeWidth={2.25} aria-hidden />
        Пополнить
      </button>
      <button
        type="button"
        onClick={onWithdraw}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#141829] font-[family-name:var(--font-inter)] text-sm font-semibold text-white ring-1 ring-inset ring-[#2a2a2a]"
      >
        <ArrowUpFromLine className="size-[18px]" strokeWidth={2.25} aria-hidden />
        Вывести
      </button>
    </div>
  )
}
