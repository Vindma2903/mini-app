import type { ReactNode } from 'react'

export interface SectionHeaderProps {
  title: string
  actionLabel?: string
  onActionClick?: () => void
  /** Контент справа от заголовка (бейджи и т.п.) */
  trailing?: ReactNode
}

export function SectionHeader({
  title,
  actionLabel = 'Все',
  onActionClick,
  trailing,
}: SectionHeaderProps): JSX.Element {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="font-[family-name:var(--font-sora)] text-base font-bold leading-none text-white">
          {title}
        </h3>
        {trailing}
      </div>
      <button
        type="button"
        onClick={onActionClick}
        className="font-[family-name:var(--font-inter)] text-xs font-medium text-[#8b5cf6]"
      >
        {actionLabel}
      </button>
    </div>
  )
}
