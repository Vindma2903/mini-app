import { Circle, Crosshair, Shield, Sword } from 'lucide-react'
import type { CategoryItem } from '../types/home'

export interface CategoryStripProps {
  items: CategoryItem[]
}

const iconMap = {
  circle: Circle,
  crosshair: Crosshair,
  sword: Sword,
  shield: Shield,
} as const

export function CategoryStrip({ items }: CategoryStripProps): JSX.Element {
  return (
    <div className="flex w-full justify-between gap-2.5">
      {items.map((item) => {
        const Icon = iconMap[item.icon]
        return (
          <div
            key={item.id}
            className="flex h-[72px] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl bg-[#141829]"
          >
            <Icon className="size-[22px] shrink-0" style={{ color: item.iconColor }} strokeWidth={2.5} />
            <span className="font-[family-name:var(--font-inter)] text-[10px] font-medium leading-none text-[#8b95b0]">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
