import {
  ArrowDownLeft,
  ArrowUpRight,
  Ticket,
  Trophy,
} from 'lucide-react'
import type { WalletTransaction } from '../../types/wallet'

export interface TransactionItemProps {
  transaction: WalletTransaction
}

function amountClass(amountLabel: string): string {
  if (amountLabel.trim().startsWith('+')) return 'text-[#22c55e]'
  if (amountLabel.trim().startsWith('-')) return 'text-[#ef4444]'
  return 'text-white'
}

function IconBox({ tx }: { tx: WalletTransaction }): JSX.Element {
  const { category } = tx
  if (category === 'deposit') {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#22c55e]/20 text-[#22c55e]">
        <ArrowDownLeft className="size-4" strokeWidth={2.25} aria-hidden />
      </div>
    )
  }
  if (category === 'win') {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#8b5cf6]/20 text-[#8b5cf6]">
        <Trophy className="size-4" strokeWidth={2.25} aria-hidden />
      </div>
    )
  }
  if (category === 'bet') {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ef4444]/20 text-[#ef4444]">
        <Ticket className="size-4" strokeWidth={2.25} aria-hidden />
      </div>
    )
  }
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ef4444]/20 text-[#ef4444]">
      <ArrowUpRight className="size-4" strokeWidth={2.25} aria-hidden />
    </div>
  )
}

function statusLabel(status: WalletTransaction['status']): string | null {
  if (status === 'pending') return 'В обработке'
  if (status === 'failed') return 'Отклонено'
  return null
}

export function TransactionItem({ transaction }: TransactionItemProps): JSX.Element {
  const { title, detail, amountLabel, status } = transaction
  const statusText = statusLabel(status)

  return (
    <article className="flex w-full items-center gap-3 rounded-xl bg-[#141829] px-3.5 py-3">
      <IconBox tx={transaction} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-[family-name:var(--font-inter)] text-[13px] font-semibold text-white">{title}</h3>
          {statusText ? (
            <span
              className={`rounded-md px-1.5 py-0.5 font-[family-name:var(--font-inter)] text-[9px] font-semibold ${
                status === 'pending' ? 'bg-[#fbbf24]/20 text-[#fbbf24]' : 'bg-[#ef4444]/20 text-[#ef4444]'
              }`}
            >
              {statusText}
            </span>
          ) : null}
        </div>
        <p className="font-[family-name:var(--font-inter)] text-[10px] font-medium leading-snug text-[#4b5577]">
          {detail}
        </p>
      </div>
      <p
        className={`shrink-0 font-[family-name:var(--font-inter)] text-sm font-bold ${amountClass(amountLabel)}`}
      >
        {amountLabel}
      </p>
    </article>
  )
}
