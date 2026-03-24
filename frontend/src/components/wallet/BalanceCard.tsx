import type { WalletBalance } from '../../types/wallet'
import { WalletActionButtons } from './WalletActionButtons'

export interface BalanceCardProps {
  balance: WalletBalance
  onDeposit?: () => void
  onWithdraw?: () => void
}

export function BalanceCard({ balance, onDeposit, onWithdraw }: BalanceCardProps): JSX.Element {
  const { primaryLabel, amountFormatted, currency, fiatHint } = balance

  return (
    <section
      className="flex w-full flex-col gap-4 rounded-2xl bg-[linear-gradient(135deg,#1a1040_0%,#141829_50%,#0f1b2d_100%)] p-5 py-6 ring-1 ring-inset ring-[#2a2a4a]"
      aria-label="Баланс"
    >
      <div className="flex flex-col gap-1.5">
        <p className="font-[family-name:var(--font-inter)] text-xs font-medium text-[#8b95b0]">{primaryLabel}</p>
        <p className="font-[family-name:var(--font-sora)] text-4xl font-bold tracking-[-1px] text-white">
          {amountFormatted} {currency}
        </p>
        <p className="font-[family-name:var(--font-inter)] text-[13px] font-medium text-[#4b5577]">{fiatHint}</p>
      </div>
      <WalletActionButtons onDeposit={onDeposit} onWithdraw={onWithdraw} />
    </section>
  )
}
