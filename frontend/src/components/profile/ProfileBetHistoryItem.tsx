import { ArrowLeftRight, CircleX, Trophy } from 'lucide-react'
import type { ProfileBetHistoryItemModel } from '../../types/profile'

export interface ProfileBetHistoryItemProps {
  item: ProfileBetHistoryItemModel
}

export function ProfileBetHistoryItem({ item }: ProfileBetHistoryItemProps): JSX.Element {
  const { title, meta, amountLabel, resultLabel, result } = item
  const win = result === 'win'
  const loss = result === 'loss'
  const toneClasses = win
    ? 'bg-[#22c55e]/20 text-[#22c55e]'
    : loss
      ? 'bg-[#ef4444]/20 text-[#ef4444]'
      : 'bg-[#334155]/30 text-[#8b95b0]'
  const amountClasses = win ? 'text-[#22c55e]' : loss ? 'text-[#ef4444]' : 'text-white'

  return (
    <article className="flex w-full items-center gap-3 rounded-xl bg-[#141829] px-3.5 py-3">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${toneClasses}`}>
        {win ? (
          <Trophy className="size-4" strokeWidth={2.25} aria-hidden />
        ) : loss ? (
          <CircleX className="size-4" strokeWidth={2.25} aria-hidden />
        ) : (
          <ArrowLeftRight className="size-4" strokeWidth={2.25} aria-hidden />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="font-[family-name:var(--font-inter)] text-xs font-semibold text-white">{title}</h3>
        <p className="font-[family-name:var(--font-inter)] text-[10px] font-medium text-[#4b5577]">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-px">
        <p className={`font-[family-name:var(--font-inter)] text-sm font-bold ${amountClasses}`}>
          {amountLabel}
        </p>
        <p className={`font-[family-name:var(--font-inter)] text-[9px] font-semibold ${amountClasses}`}>
          {resultLabel}
        </p>
      </div>
    </article>
  )
}
