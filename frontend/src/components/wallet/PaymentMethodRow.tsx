import { Bitcoin, CreditCard } from 'lucide-react'
import type { WalletPaymentMethod } from '../../types/wallet'

export interface PaymentMethodRowProps {
  method: WalletPaymentMethod
}

export function PaymentMethodRow({ method }: PaymentMethodRowProps): JSX.Element {
  const isCrypto = method.variant === 'crypto'

  return (
    <div className="flex h-14 w-full min-w-0 items-center gap-2.5 rounded-xl bg-[#141829] px-3.5">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${
          isCrypto ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#3b82f6]/20 text-[#3b82f6]'
        }`}
      >
        {isCrypto ? (
          <Bitcoin className="size-[18px]" strokeWidth={2.25} aria-hidden />
        ) : (
          <CreditCard className="size-[18px]" strokeWidth={2.25} aria-hidden />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-px">
        <p className="truncate font-[family-name:var(--font-inter)] text-[13px] font-semibold text-white">
          {method.name}
        </p>
        <p className="truncate font-[family-name:var(--font-inter)] text-[10px] font-medium text-[#4b5577]">
          {method.subtitle}
        </p>
      </div>
    </div>
  )
}
