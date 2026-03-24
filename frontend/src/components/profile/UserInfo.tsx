import { Crown, PenLine } from 'lucide-react'
import type { ProfileUser } from '../../types/profile'

export interface UserInfoProps {
  user: ProfileUser
  onEditClick?: () => void
}

export function UserInfo({ user, onEditClick }: UserInfoProps): JSX.Element {
  const { avatarLetter, displayName, username, numericId, isVip } = user

  return (
    <section
      className="flex w-full items-center gap-3.5 rounded-2xl bg-[#141829] px-4 py-5"
      aria-label="Профиль пользователя"
    >
      <div className="flex size-14 shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6]">
        <span className="font-[family-name:var(--font-sora)] text-[22px] font-bold text-white" aria-hidden>
          {avatarLetter}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-[family-name:var(--font-inter)] text-[13px] font-medium text-[#8b95b0]">
          {displayName}
        </p>
        <p className="truncate font-[family-name:var(--font-sora)] text-base font-bold text-white">{username}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-[family-name:var(--font-inter)] text-[11px] font-medium text-[#4b5577]">
            ID: {numericId}
          </p>
          {isVip ? (
            <div className="flex items-center gap-1 rounded-md bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] px-2 py-0.5">
              <Crown className="size-2.5 text-[#0a0e1a]" strokeWidth={2.5} aria-hidden />
              <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold text-[#0a0e1a]">VIP</span>
            </div>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onEditClick}
        className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#1c2036] text-[#8b95b0]"
        aria-label="Редактировать профиль"
      >
        <PenLine className="size-3.5" strokeWidth={2.25} />
      </button>
    </section>
  )
}
