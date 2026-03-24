import { LogOut } from 'lucide-react'

export interface ProfileLogoutButtonProps {
  onClick?: () => void
}

export function ProfileLogoutButton({ onClick }: ProfileLogoutButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#141829] font-[family-name:var(--font-inter)] text-sm font-medium text-[#ef4444] ring-1 ring-inset ring-[#ef4444]/20"
    >
      <LogOut className="size-4" strokeWidth={2.25} aria-hidden />
      Выйти из аккаунта
    </button>
  )
}
