import type { LiveMatchData } from '../types/home'

export interface LiveMatchRowProps {
  match: LiveMatchData
}

const toneClass: Record<LiveMatchData['odds'][0]['tone'], string> = {
  green: 'text-[#22c55e]',
  amber: 'text-[#fbbf24]',
  white: 'text-white',
}

export function LiveMatchRow({ match }: LiveMatchRowProps): JSX.Element {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-[14px] bg-[#141829] px-3 py-2.5 sm:gap-2.5 sm:px-3.5 sm:py-3">
      {/* Статус LIVE — компактнее на узкой ширине */}
      <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 sm:w-[50px]">
        <div className="rounded bg-[#ef4444] px-1 py-0.5 sm:px-1.5 sm:py-0.5">
          <span className="font-[family-name:var(--font-inter)] text-[7px] font-bold uppercase leading-none text-white sm:text-[8px]">
            {match.liveLabel}
          </span>
        </div>
        <span className="font-[family-name:var(--font-inter)] text-[10px] font-semibold leading-none text-[#ef4444] sm:text-[11px]">
          {match.timer}
        </span>
      </div>

      {/* Центр: две половины + счёт; min-w-0 + truncate, отступ до коэффициентов */}
      <div className="flex min-w-0 flex-1 items-center gap-1 pr-2 sm:gap-2 sm:pr-3">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
          <div
            className="size-5 shrink-0 rounded-[10px] bg-[#1c2036] sm:size-6 sm:rounded-xl"
            aria-hidden
          />
          <span className="min-w-0 truncate text-left font-[family-name:var(--font-inter)] text-[10px] font-semibold leading-tight text-white sm:text-[11px]">
            {match.teamLeft.name}
          </span>
        </div>
        <span className="shrink-0 whitespace-nowrap px-1 text-center font-[family-name:var(--font-sora)] text-xs font-bold tabular-nums text-white sm:px-1.5 sm:text-sm">
          {match.score}
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          <span className="min-w-0 truncate text-right font-[family-name:var(--font-inter)] text-[10px] font-semibold leading-tight text-white sm:text-[11px]">
            {match.teamRight.name}
          </span>
          <div
            className="size-5 shrink-0 rounded-[10px] bg-[#1c2036] sm:size-6 sm:rounded-xl"
            aria-hidden
          />
        </div>
      </div>

      <div className="flex w-12 shrink-0 flex-col gap-1 sm:w-[52px]">
        {match.odds.map((o, i) => (
          <div
            key={i}
            className="flex h-6 items-center justify-center rounded-md bg-[#1c2036]"
          >
            <span
              className={`font-[family-name:var(--font-inter)] text-[10px] font-bold leading-none sm:text-[11px] ${toneClass[o.tone]}`}
            >
              {o.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
