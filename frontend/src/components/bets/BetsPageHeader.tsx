import { ChevronLeft, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PATHS } from '../../routes/paths'
import type { BetListTab } from '../../types/bets'

export interface BetsPageHeaderProps {
  tab: BetListTab
  count: number
  onClear?: () => void
}

export function BetsPageHeader({ tab, count, onClear }: BetsPageHeaderProps): JSX.Element {
  const showClear = tab === 'active' && count > 0

  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Link
          to={PATHS.home}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#141829] text-white"
          aria-label="Назад на главную"
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </Link>
        <h1 className="truncate font-[family-name:var(--font-sora)] text-[22px] font-bold leading-none tracking-[-0.5px] text-white">
          Мои ставки
        </h1>
        <div className="flex shrink-0 items-center rounded-xl bg-[#8b5cf6]/20 px-2.5 py-1">
          <span className="font-[family-name:var(--font-inter)] text-xs font-bold text-[#8b5cf6]">{count}</span>
        </div>
      </div>
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          className="flex shrink-0 items-center gap-1 rounded-[10px] px-3 py-2 text-[#ef4444]"
        >
          <Trash2 className="size-3.5" strokeWidth={2.25} />
          <span className="font-[family-name:var(--font-inter)] text-xs font-medium">Очистить</span>
        </button>
      ) : null}
    </header>
  )
}
