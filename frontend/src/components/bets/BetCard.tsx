import { Pencil } from 'lucide-react'
import type { BetRecord } from '../../types/bets'
import { BetLeagueMarkIcon } from './leagueMark'

export interface BetCardProps {
  bet: BetRecord
}

function StatusRibbon({ outcome }: { outcome: BetRecord['outcome'] }): JSX.Element | null {
  if (outcome === 'active') return null
  if (outcome === 'won') {
    return (
      <div className="border-b border-[#1c2036] bg-[#22c55e]/15 px-3.5 py-2">
        <p className="font-[family-name:var(--font-inter)] text-xs font-semibold text-[#22c55e]">Выиграла</p>
      </div>
    )
  }
  return (
    <div className="border-b border-[#1c2036] bg-[#ef4444]/15 px-3.5 py-2">
      <p className="font-[family-name:var(--font-inter)] text-xs font-semibold text-[#ef4444]">Проиграла</p>
    </div>
  )
}

export function BetCard({ bet }: BetCardProps): JSX.Element {
  const { leagueLine, leagueMark, isLive, matchTitle, marketLabel, selection, coefficient, stakeFormatted, currency, outcome } =
    bet

  return (
    <article className="overflow-hidden rounded-[14px] bg-[#141829]">
      <StatusRibbon outcome={outcome} />

      <header className="flex w-full items-center justify-between bg-[#1c203640] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <BetLeagueMarkIcon mark={leagueMark} />
          <p className="truncate font-[family-name:var(--font-inter)] text-[10px] font-medium text-[#8b95b0]">
            {leagueLine}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isLive ? (
            <div className="flex items-center gap-1 rounded-md bg-[#ef4444] px-2 py-0.5">
              <span className="size-[5px] shrink-0 rounded-full bg-white" aria-hidden />
              <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase leading-none text-white">
                LIVE
              </span>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-2 px-3.5 py-3">
        <h2 className="font-[family-name:var(--font-inter)] text-[13px] font-semibold leading-snug text-white">
          {matchTitle}
        </h2>

        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-[family-name:var(--font-inter)] text-[10px] font-medium text-[#4b5577]">{marketLabel}</p>
            <p className="font-[family-name:var(--font-inter)] text-xs font-semibold text-[#8b5cf6]">{selection}</p>
          </div>
          <div className="shrink-0 rounded-lg bg-[#22c55e]/20 px-3 py-1.5">
            <p className="font-[family-name:var(--font-sora)] text-base font-bold text-[#22c55e]">{coefficient}</p>
          </div>
        </div>

        {outcome === 'active' ? (
          <div className="flex h-11 w-full items-center justify-between rounded-[10px] bg-[#1c2036] px-3 ring-1 ring-inset ring-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Pencil className="size-3.5 text-[#4b5577]" strokeWidth={2.25} aria-hidden />
              <span className="font-[family-name:var(--font-inter)] text-[15px] font-semibold text-white">
                {stakeFormatted}
              </span>
            </div>
            <span className="font-[family-name:var(--font-inter)] text-sm font-medium text-[#8b95b0]">{currency}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1 rounded-[10px] bg-[#1c2036] px-3 py-2.5 ring-1 ring-inset ring-[#2a2a2a]">
            <p className="font-[family-name:var(--font-inter)] text-[10px] font-medium text-[#8b95b0]">Ставка</p>
            <p className="font-[family-name:var(--font-inter)] text-sm font-semibold text-white">
              {stakeFormatted} {currency}
            </p>
            {bet.settlementLabel && bet.settlementAmount ? (
              <p
                className={`font-[family-name:var(--font-inter)] text-sm font-bold ${
                  outcome === 'won' ? 'text-[#22c55e]' : 'text-[#ef4444]'
                }`}
              >
                {bet.settlementLabel} {bet.settlementAmount} {currency}
              </p>
            ) : null}
          </div>
        )}

        {outcome === 'active' && bet.potentialWinFormatted ? (
          <p className="font-[family-name:var(--font-inter)] text-[10px] font-medium text-[#4b5577]">
            Возможный выигрыш:{' '}
            <span className="font-semibold text-[#22c55e]">{bet.potentialWinFormatted}</span> {currency}
          </p>
        ) : null}
      </div>
    </article>
  )
}
