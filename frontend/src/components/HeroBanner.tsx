import { ArrowRight } from 'lucide-react'

export interface HeroBannerProps {
  onCtaClick?: () => void
  isClaimed?: boolean
}

export function HeroBanner({ onCtaClick, isClaimed = false }: HeroBannerProps): JSX.Element {
  return (
    <div className="relative flex min-h-[160px] w-full min-w-0 max-w-full shrink-0 items-center overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #6d28d9 0%, #3b82f6 60%, #1e40af 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute -right-6 -top-10 size-[min(200px,55vw)] rounded-full bg-[#8b5cf6]/40 opacity-40 blur-2xl sm:-right-8 sm:size-[200px]"
        aria-hidden
      />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col justify-center gap-2 py-4 pl-4 pr-2 sm:pl-5 sm:pr-3 sm:py-6">
        <div className="w-fit max-w-full rounded-xl bg-[#fbbf24]/20 px-2 py-1 sm:px-2.5">
          <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase leading-tight tracking-[0.08em] text-[#fbbf24] sm:text-[10px] sm:tracking-[1px]">
            🎁 НОВЫЙ ИГРОК
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold leading-tight tracking-[-0.5px] text-white sm:text-2xl">
          Бонус за вход
        </h2>
        <p className="min-w-0 font-[family-name:var(--font-inter)] text-xs font-medium leading-snug text-white/80 sm:text-[13px]">
          Получи +100% к первому депозиту
        </p>
        <button
          type="button"
          onClick={onCtaClick}
          disabled={isClaimed}
          className="mt-0.5 flex w-fit shrink-0 items-center gap-1 rounded-[20px] bg-[#fbbf24] px-3.5 py-2 sm:px-4 disabled:opacity-50"
        >
          <span className="font-[family-name:var(--font-inter)] text-xs font-bold text-[#0a0e1a]">
            {isClaimed ? 'Бонус получен' : 'Забрать'}
          </span>
          {!isClaimed ? <ArrowRight className="size-3.5 shrink-0 text-[#0a0e1a]" strokeWidth={2.5} /> : null}
        </button>
      </div>

      <div
        className="relative z-[1] my-3 mr-2 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 sm:mr-2.5 sm:my-3.5 sm:size-[120px] min-[420px]:size-[140px]"
        aria-hidden
      >
        <div
          className="flex size-full items-center justify-center text-4xl opacity-90 sm:text-5xl"
          role="img"
          aria-label="Промо"
        >
          🎁
        </div>
      </div>
    </div>
  )
}
