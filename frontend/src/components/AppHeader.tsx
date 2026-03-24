import { CircleDollarSign, Plus, Zap } from 'lucide-react'

export interface AppHeaderProps {
  balance: string
  currencySuffix?: string
}

export function AppHeader({ balance, currencySuffix = '₽' }: AppHeaderProps): JSX.Element {
  return (
    <div className="flex h-14 w-full shrink-0 items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-[#8b5cf6] to-[#3b82f6]">
          <Zap className="size-[18px] text-white" strokeWidth={2.5} />
        </div>
        <span
          className="font-[family-name:var(--font-sora)] text-lg font-bold leading-none tracking-[-0.5px] text-white"
        >
          BetNeon
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1 rounded-[20px] bg-[#141829] px-2.5 py-1.5">
          <CircleDollarSign className="size-3.5 shrink-0 text-[#fbbf24]" strokeWidth={2.5} />
          <span className="font-[family-name:var(--font-inter)] text-[13px] font-semibold leading-none text-white">
            {balance}
          </span>
          <span className="font-[family-name:var(--font-inter)] text-[10px] font-medium leading-none text-[#8b95b0]">
            {currencySuffix}
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-[20px] bg-[#fbbf24] px-3.5 py-2"
        >
          <Plus className="size-3 text-[#0a0e1a]" strokeWidth={3} />
          <span className="font-[family-name:var(--font-inter)] text-xs font-bold leading-none text-[#0a0e1a]">
            Депозит
          </span>
        </button>
      </div>
    </div>
  )
}
