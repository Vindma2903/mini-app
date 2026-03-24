import type { LiveOddCell } from '../../types/live'

export interface LiveOddsCellProps {
  odd: LiveOddCell
}

export function LiveOddsCell({ odd }: LiveOddsCellProps): JSX.Element {
  const { label, value, variant = 'default' } = odd
  const muted = variant === 'muted'
  const accent = variant === 'accent'
  const positive = variant === 'positive'

  const labelClass = accent ? 'text-[#8b5cf6]' : 'text-[#4b5577]'

  const valueClass = muted
    ? 'text-[#4b5577]'
    : accent
      ? 'text-[#8b5cf6]'
      : positive
        ? 'text-[#22c55e]'
        : 'text-white'

  return (
    <div
      className={`flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] ${
        accent ? 'bg-[#8b5cf620] ring-1 ring-inset ring-[#8b5cf640]' : 'bg-[#1c2036]'
      }`}
    >
      <span className={`font-[family-name:var(--font-inter)] text-[9px] font-medium leading-none ${labelClass}`}>
        {label}
      </span>
      <span className={`font-[family-name:var(--font-inter)] text-sm font-bold leading-none ${valueClass}`}>
        {value}
      </span>
    </div>
  )
}
