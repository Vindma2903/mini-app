import { Crosshair } from 'lucide-react'
import type { LiveMatchCardModel } from '../../types/live'
import { leagueDotClass } from './leagueMarkClasses'
import { LiveOddsCell } from './LiveOddsCell'

export interface LiveMatchCardProps {
  match: LiveMatchCardModel
}

export function LiveMatchCard({ match }: LiveMatchCardProps): JSX.Element {
  const { league, leagueMark, timer, teamLeft, teamRight, score, meta, odds } = match

  return (
    <article className="w-full overflow-hidden rounded-[14px] bg-[#141829]">
      <div className="flex w-full items-center justify-between bg-[#1c203640] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {leagueMark.type === 'dot' ? (
            <span className={`size-2 shrink-0 rounded-full ${leagueDotClass(leagueMark.tone)}`} aria-hidden />
          ) : (
            <Crosshair className="size-2.5 shrink-0 text-[#ef4444]" strokeWidth={2.5} aria-hidden />
          )}
          <span className="truncate font-[family-name:var(--font-inter)] text-[11px] font-medium text-[#8b95b0]">
            {league}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-[family-name:var(--font-inter)] text-[11px] font-semibold text-[#ef4444]">
            {timer}
          </span>
          <div className="flex items-center gap-1 rounded-md bg-[#ef4444] px-2 py-0.5">
            <span className="size-[5px] shrink-0 rounded-full bg-white" aria-hidden />
            <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase leading-none text-white">
              LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-between px-3.5 py-3.5">
        <section className="flex w-20 flex-col items-center gap-1.5" aria-label={teamLeft.name}>
          <div className="size-10 shrink-0 rounded-full bg-[#1c2036]" />
          <span className="text-center font-[family-name:var(--font-inter)] text-xs font-semibold leading-tight text-white">
            {teamLeft.name}
          </span>
        </section>

        <section className="flex flex-col items-center gap-1" aria-label={`Счёт ${score}`}>
          <p className="font-[family-name:var(--font-sora)] text-[28px] font-bold leading-none tabular-nums text-white">
            {score}
          </p>
          <p className="text-center font-[family-name:var(--font-inter)] text-[10px] font-medium leading-tight text-[#4b5577]">
            {meta}
          </p>
        </section>

        <section className="flex w-20 flex-col items-center gap-1.5" aria-label={teamRight.name}>
          <div className="size-10 shrink-0 rounded-full bg-[#1c2036]" />
          <span className="text-center font-[family-name:var(--font-inter)] text-xs font-semibold leading-tight text-white">
            {teamRight.name}
          </span>
        </section>
      </div>

      <div className="flex gap-2 px-3.5 pb-3.5 pt-0">
        {odds.map((odd, index) => (
          <LiveOddsCell key={`${match.id}-odd-${index}`} odd={odd} />
        ))}
      </div>
    </article>
  )
}
