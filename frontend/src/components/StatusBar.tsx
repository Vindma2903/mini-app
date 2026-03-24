import { BatteryFull, Signal, Wifi } from 'lucide-react'

export function StatusBar(): JSX.Element {
  return (
    <header
      className="flex h-[54px] w-full shrink-0 items-center justify-between px-6 py-[17px] text-white"
      aria-hidden
    >
      <span className="font-[family-name:var(--font-inter)] text-base font-semibold leading-none">
        9:41
      </span>
      <div className="flex items-center gap-1.5">
        <Signal className="size-4 stroke-[2.5]" aria-hidden />
        <Wifi className="size-4 stroke-[2.5]" aria-hidden />
        <BatteryFull className="size-4 stroke-[2.5]" aria-hidden />
      </div>
    </header>
  )
}
