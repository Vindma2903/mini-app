import type { LiveCategoryId, LiveCategoryTabModel } from '../../types/live'

export interface LiveCategoryTabsProps {
  tabs: LiveCategoryTabModel[]
  activeId: LiveCategoryId
  onChange: (id: LiveCategoryId) => void
}

export function LiveCategoryTabs({ tabs, activeId, onChange }: LiveCategoryTabsProps): JSX.Element {
  return (
    <div
      className="flex h-10 w-full shrink-0 gap-0 rounded-xl bg-[#141829] p-1"
      role="tablist"
      aria-label="Категории трансляций"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[13px] transition-colors ${
              active
                ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] font-semibold text-white'
                : 'font-medium text-[#4b5577]'
            }`}
          >
            <Icon className="size-3.5 shrink-0" strokeWidth={2.5} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
