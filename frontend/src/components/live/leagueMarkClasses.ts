import type { LiveLeagueDotTone } from '../../types/live'

const DOT_TONE: Record<LiveLeagueDotTone, string> = {
  blue: 'bg-[#3b82f6]',
  orange: 'bg-[#f97316]',
  red: 'bg-[#ef4444]',
}

export function leagueDotClass(tone: LiveLeagueDotTone): string {
  return DOT_TONE[tone]
}
