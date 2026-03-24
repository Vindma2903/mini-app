import { Circle, Crosshair } from 'lucide-react'
import type { MatchCardData } from '../types/home'

export interface MatchCardProps {
  match: MatchCardData
}

const leagueIconMap = {
  circle: Circle,
  crosshair: Crosshair,
} as const

export function MatchCard({ match }: MatchCardProps): JSX.Element {
  const LeagueIcon = leagueIconMap[match.leagueIcon]

  return (
    <article
      className="flex w-[220px] shrink-0 flex-col overflow-hidden rounded-[14px] bg-[#141829]"
      aria-label={`${match.teamLeft.name} против ${match.teamRight.name}`}
    >
      <div className="flex flex-col gap-2.5 px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-center gap-1.5">
          <LeagueIcon className="size-2.5 shrink-0" style={{ color: match.leagueIconColor }} strokeWidth={2.5} />
          <span className="font-[family-name:var(--font-inter)] text-[10px] font-medium leading-none text-[#4b5577]">
            {match.league}
          </span>
        </div>
        <div className="flex w-full items-center justify-between">
          <div className="flex w-[60px] flex-col items-center gap-1">
            <div className="size-8 rounded-2xl bg-[#1c2036]" />
            <span className="font-[family-name:var(--font-inter)] text-[11px] font-semibold leading-none text-white">
              {match.teamLeft.name}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-[family-name:var(--font-sora)] text-xs font-bold text-[#4b5577]">VS</span>
            <span className="font-[family-name:var(--font-inter)] text-[9px] font-medium leading-none text-[#4b5577]">
              {match.vsMeta}
            </span>
          </div>
          <div className="flex w-[60px] flex-col items-center gap-1">
            <div className="size-8 rounded-2xl bg-[#1c2036]" />
            <span className="font-[family-name:var(--font-inter)] text-[11px] font-semibold leading-none text-white">
              {match.teamRight.name}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-1.5 px-3.5 pb-3.5 pt-2.5">
        {match.odds.map((o) => (
          <div
            key={o.label}
            className={`flex h-9 flex-1 flex-col items-center justify-center gap-px rounded-lg ${
              o.variant === 'accent' ? 'bg-[#8b5cf620]' : 'bg-[#1c2036]'
            }`}
          >
            <span
              className={`font-[family-name:var(--font-inter)] text-[9px] font-medium leading-none ${
                o.variant === 'accent' ? 'text-[#8b5cf6]' : 'text-[#4b5577]'
              }`}
            >
              {o.label}
            </span>
            <span
              className={`font-[family-name:var(--font-inter)] text-[13px] font-bold leading-none ${
                o.variant === 'accent' ? 'text-[#8b5cf6]' : 'text-white'
              }`}
            >
              {o.value}
            </span>
          </div>
        ))}
      </div>
    </article>
  )
}
