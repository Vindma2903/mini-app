import { ChevronRight } from 'lucide-react'
import { useCallback, useId } from 'react'
import type { ProfileMenuItemModel } from '../../types/profile'
import { ProfileMenuToggle } from './ProfileMenuToggle'

export interface ProfileMenuProps {
  items: ProfileMenuItemModel[]
  notificationsOn: boolean
  onNotificationsChange: (next: boolean) => void
  onItemClick?: (id: string) => void
}

export function ProfileMenu({
  items,
  notificationsOn,
  onNotificationsChange,
  onItemClick,
}: ProfileMenuProps): JSX.Element {
  const notificationsLabelId = useId()

  const onNav = useCallback(
    (id: string) => {
      onItemClick?.(id)
    },
    [onItemClick],
  )

  return (
    <nav className="overflow-hidden rounded-[14px] bg-[#141829]" aria-label="Меню профиля">
      <ul className="flex list-none flex-col gap-0.5 p-0">
        {items.map((item, index) => {
          const Icon = item.icon
          return (
            <li key={item.id}>
              {index > 0 ? <div className="h-px w-full bg-[#1c2036]" aria-hidden /> : null}
              {item.trailing === 'toggle' ? (
                <div className="flex min-w-0 items-center gap-3 py-3.5 pl-3.5 pr-4">
                  <Icon className={`size-[18px] shrink-0 ${item.iconClassName}`} strokeWidth={2.25} aria-hidden />
                  <span id={notificationsLabelId} className="min-w-0 flex-1 font-[family-name:var(--font-inter)] text-sm font-medium text-white">
                    {item.label}
                  </span>
                  <ProfileMenuToggle
                    pressed={notificationsOn}
                    onChange={onNotificationsChange}
                    labelledBy={notificationsLabelId}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onNav(item.id)}
                  className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left"
                >
                  <Icon className={`size-[18px] shrink-0 ${item.iconClassName}`} strokeWidth={2.25} aria-hidden />
                  <span className="min-w-0 flex-1 font-[family-name:var(--font-inter)] text-sm font-medium text-white">
                    {item.label}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[#4b5577]" strokeWidth={2.25} aria-hidden />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
