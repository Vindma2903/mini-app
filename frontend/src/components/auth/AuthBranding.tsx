import { Zap } from 'lucide-react'

export function AuthBranding(): JSX.Element {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex size-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#8b5cf6] via-[#3b82f6] to-[#1e40af] shadow-[0_4px_30px_rgba(139,92,246,0.25)]">
        <Zap className="size-9 text-white" strokeWidth={2.25} aria-hidden />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-[family-name:var(--font-sora)] text-[32px] font-bold tracking-[-1px] text-white">
          BetNeon
        </h1>
        <p className="font-[family-name:var(--font-inter)] text-sm font-medium text-[#8b95b0]">
          Ставки на спорт и киберспорт
        </p>
      </div>
    </div>
  )
}
