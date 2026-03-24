import type { ProfileBetHistoryItemModel } from '../../types/profile'
import { ProfileBetHistoryItem } from './ProfileBetHistoryItem'

export interface ProfileBetHistoryProps {
  items: ProfileBetHistoryItemModel[]
  onSeeAll?: () => void
}

export function ProfileBetHistory({ items, onSeeAll }: ProfileBetHistoryProps): JSX.Element {
  return (
    <section className="flex flex-col gap-2.5" aria-label="Последние ставки">
      <div className="flex w-full items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">Последние ставки</h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="shrink-0 font-[family-name:var(--font-inter)] text-xs font-medium text-[#8b5cf6]"
        >
          Все
        </button>
      </div>
      <ul className="flex list-none flex-col gap-2.5 p-0">
        {items.map((item) => (
          <li key={item.id}>
            <ProfileBetHistoryItem item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}
