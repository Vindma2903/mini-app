import { ChevronLeft, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PATHS } from '../../routes/paths'

export interface LiveScreenHeaderProps {
  liveCount: number
  onSearchClick?: () => void
  onFilterClick?: () => void
}

export function LiveScreenHeader({
  liveCount,
  onSearchClick,
  onFilterClick,
}: LiveScreenHeaderProps): JSX.Element {
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
          Live
        </h1>
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#ef4444]/20 px-2.5 py-1">
          <span className="size-1.5 shrink-0 rounded-full bg-[#ef4444]" aria-hidden />
          <span className="whitespace-nowrap font-[family-name:var(--font-inter)] text-[11px] font-semibold text-[#ef4444]">
            {liveCount} матчей
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onSearchClick}
          className="flex size-9 items-center justify-center rounded-xl bg-[#141829] text-[#8b95b0]"
          aria-label="Поиск"
        >
          <Search className="size-[18px]" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={onFilterClick}
          className="flex size-9 items-center justify-center rounded-xl bg-[#141829] text-[#8b95b0]"
          aria-label="Фильтры"
        >
          <SlidersHorizontal className="size-[18px]" strokeWidth={2.25} />
        </button>
      </div>
    </header>
  )
}
