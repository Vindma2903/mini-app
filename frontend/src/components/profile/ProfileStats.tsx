import type { ProfileStat } from '../../types/profile'

export interface ProfileStatsProps {
  stats: ProfileStat[]
}

export function ProfileStats({ stats }: ProfileStatsProps): JSX.Element {
  return (
    <section className="grid w-full grid-cols-3 gap-2.5" aria-label="Статистика">
      {stats.map((s) => (
        <article
          key={s.id}
          className="flex flex-col items-center gap-1 rounded-xl bg-[#141829] px-3 py-3.5 text-center"
        >
          <p className={`font-[family-name:var(--font-sora)] text-base font-bold ${s.valueClassName}`}>{s.value}</p>
          <p className="font-[family-name:var(--font-inter)] text-[10px] font-medium text-[#4b5577]">{s.label}</p>
        </article>
      ))}
    </section>
  )
}
