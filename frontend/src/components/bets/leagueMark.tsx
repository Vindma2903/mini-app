import { Crosshair } from 'lucide-react'
import type { BetLeagueMark } from '../../types/bets'

const DOT: Record<'blue' | 'red', string> = {
  blue: 'bg-[#3b82f6]',
  red: 'bg-[#ef4444]',
}

export function BetLeagueMarkIcon({ mark }: { mark: BetLeagueMark }): JSX.Element {
  if (mark.type === 'dot') {
    return <span className={`size-2 shrink-0 rounded-full ${DOT[mark.tone]}`} aria-hidden />
  }
  return <Crosshair className="size-2.5 shrink-0 text-[#ef4444]" strokeWidth={2.5} aria-hidden />
}
