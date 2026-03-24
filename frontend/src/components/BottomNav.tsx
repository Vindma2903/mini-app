import { NavLink } from 'react-router-dom'
import { TAB_ITEMS } from '../navigation/tabConfig'

function tabClassName(active: boolean): string {
  return [
    'flex flex-1 flex-col items-center gap-1 py-1.5',
    active ? 'text-[#8b5cf6]' : 'text-[#4b5577]',
  ].join(' ')
}

export function BottomNav(): JSX.Element {
  return (
    <nav
      className="mt-auto flex w-full justify-around border-t border-[#1c2036] bg-[#0d1121] px-0 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      aria-label="Основная навигация"
    >
      {TAB_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => tabClassName(isActive)}
        >
          {({ isActive }) => (
            <>
              <Icon className="size-[22px] shrink-0" strokeWidth={isActive ? 2.5 : 2.25} />
              <span
                className={`font-[family-name:var(--font-inter)] text-[10px] tracking-[0.5px] ${
                  isActive ? 'font-semibold' : 'font-medium'
                }`}
              >
                {label}
              </span>
              <span
                className={`size-1 shrink-0 rounded-full ${isActive ? 'bg-[#8b5cf6]' : 'bg-transparent'}`}
                aria-hidden
              />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
