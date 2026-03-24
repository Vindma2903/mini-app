import { CircleCheck } from 'lucide-react'
import type { BetsTotals } from '../../types/bets'

export interface BetsSlipSummaryProps {
  totals: BetsTotals
  onPlaceBet?: () => void
}

export function BetsSlipSummary({ totals, onPlaceBet }: BetsSlipSummaryProps): JSX.Element {
  const { totalStakeFormatted, count, potentialWinFormatted, oddsHint, currency } = totals

  return (
    <section className="overflow-hidden rounded-[14px] bg-[#141829]" aria-label="Итого по активным ставкам">
      <div className="flex flex-col gap-2.5 px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-[family-name:var(--font-inter)] text-xs font-medium text-[#8b95b0]">
            Общая сумма ставок
          </span>
          <span className="font-[family-name:var(--font-inter)] text-[13px] font-semibold text-white">
            {totalStakeFormatted} {currency}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-[family-name:var(--font-inter)] text-xs font-medium text-[#8b95b0]">
            Количество ставок
          </span>
          <span className="font-[family-name:var(--font-inter)] text-[13px] font-semibold text-white">{count}</span>
        </div>
      </div>
      <div className="h-px w-full bg-[#1c2036]" aria-hidden />
      <div className="flex items-start justify-between gap-3 px-3.5 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-[family-name:var(--font-inter)] text-xs font-medium text-[#8b95b0]">
            Потенциальный выигрыш
          </span>
          <span className="font-[family-name:var(--font-inter)] text-[10px] text-[#4b5577]">{oddsHint}</span>
        </div>
        <p className="shrink-0 font-[family-name:var(--font-sora)] text-[22px] font-bold text-[#22c55e]">
          {potentialWinFormatted} {currency}
        </p>
      </div>
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onPlaceBet}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] font-[family-name:var(--font-inter)] text-base font-bold text-[#0a0e1a]"
        >
          <CircleCheck className="size-5" strokeWidth={2.25} aria-hidden />
          Сделать ставку · {totalStakeFormatted} {currency}
        </button>
      </div>
    </section>
  )
}
