export interface GuestContinueLinkProps {
  onClick: () => void
  disabled?: boolean
}

export function GuestContinueLink({ onClick, disabled }: GuestContinueLinkProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full font-[family-name:var(--font-inter)] text-[13px] font-medium text-[#4b5577] disabled:opacity-50"
    >
      Продолжить как гость
    </button>
  )
}
