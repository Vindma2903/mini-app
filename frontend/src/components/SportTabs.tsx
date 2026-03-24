import { Gamepad2, Trophy } from 'lucide-react'
import type { SportTab } from '../types/home'

export interface SportTabsProps {
  tabs: SportTab[]
  activeId: string
  onChange: (id: string) => void
}

const iconMap = {
  trophy: Trophy,
  'gamepad-2': Gamepad2,
} as const

export function SportTabs({ tabs, activeId, onChange }: SportTabsProps): JSX.Element {
  return (
    <div className="flex h-10 w-full shrink-0 gap-0 rounded-xl bg-[#141829] p-1">
      {tabs.map((tab) => {
        const Icon = iconMap[tab.icon]
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
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
