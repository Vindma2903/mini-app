export interface ProfileMenuToggleProps {
  pressed: boolean
  onChange: (next: boolean) => void
  labelledBy: string
}

export function ProfileMenuToggle({ pressed, onChange, labelledBy }: ProfileMenuToggleProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!pressed)}
      className={`flex h-6 w-11 shrink-0 items-center rounded-xl p-0.5 transition-colors ${
        pressed ? 'justify-end bg-[#8b5cf6]' : 'justify-start bg-[#1c2036]'
      }`}
    >
      <span className="size-5 shrink-0 rounded-full bg-white" aria-hidden />
    </button>
  )
}
