import { Settings } from 'lucide-react'

export interface WalletPageHeaderProps {
  onSettingsClick?: () => void
}

export function WalletPageHeader({ onSettingsClick }: WalletPageHeaderProps): JSX.Element {
  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between px-4 py-2">
      <h1 className="font-[family-name:var(--font-sora)] text-[22px] font-bold leading-none tracking-[-0.5px] text-white">
        Кошелёк
      </h1>
      <button
        type="button"
        onClick={onSettingsClick}
        className="flex size-9 items-center justify-center rounded-xl bg-[#141829] text-[#8b95b0]"
        aria-label="Настройки кошелька"
      >
        <Settings className="size-[18px]" strokeWidth={2.25} />
      </button>
    </header>
  )
}
