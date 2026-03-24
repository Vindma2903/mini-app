import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { CategoryStrip } from '../components/CategoryStrip'
import { HeroBanner } from '../components/HeroBanner'
import { LiveMatchRow } from '../components/LiveMatchRow'
import { MatchCard } from '../components/MatchCard'
import { SectionHeader } from '../components/SectionHeader'
import { SportTabs } from '../components/SportTabs'
import { StatusBar } from '../components/StatusBar'
import type { CategoryItem, LiveMatchData, MatchCardData, SportTab } from '../types/home'

const SPORT_TABS: SportTab[] = [
  { id: 'sport', label: 'Спорт', icon: 'trophy' },
  { id: 'esport', label: 'Киберспорт', icon: 'gamepad-2' },
]

const CATEGORIES: CategoryItem[] = [
  { id: 'fb', label: 'Футбол', icon: 'circle', iconColor: '#3b82f6' },
  { id: 'cs2', label: 'CS2', icon: 'crosshair', iconColor: '#ef4444' },
  { id: 'dota', label: 'Dota 2', icon: 'sword', iconColor: '#ef4444' },
  { id: 'val', label: 'Valorant', icon: 'shield', iconColor: '#f97316' },
]

const POPULAR_MATCHES: MatchCardData[] = [
  {
    id: 'm1',
    league: 'Лига чемпионов',
    leagueIcon: 'circle',
    leagueIconColor: '#3b82f6',
    teamLeft: { name: 'PSG' },
    teamRight: { name: 'Bayern' },
    vsMeta: 'Завтра, 21:00',
    odds: [
      { label: '1', value: '2.10' },
      { label: 'X', value: '3.40' },
      { label: '2', value: '3.05' },
    ],
  },
  {
    id: 'm2',
    league: 'ESL Pro League',
    leagueIcon: 'crosshair',
    leagueIconColor: '#ef4444',
    teamLeft: { name: 'NaVi' },
    teamRight: { name: 'FaZe' },
    vsMeta: 'Сегодня, 18:30',
    odds: [
      { label: '1', value: '1.85' },
      { label: 'X', value: '3.80', variant: 'accent' },
      { label: '2', value: '2.20' },
    ],
  },
]

const LIVE_MATCHES: LiveMatchData[] = [
  {
    id: 'l1',
    liveLabel: 'LIVE',
    timer: "67'",
    teamLeft: { name: 'Real Madrid' },
    teamRight: { name: 'Liverpool' },
    score: '2 - 1',
    odds: [
      { value: '1.45', tone: 'green' },
      { value: '3.10', tone: 'white' },
    ],
  },
]

export function HomePage(): JSX.Element {
  const [tab, setTab] = useState('sport')

  return (
    <>
      <StatusBar />
      <AppHeader balance="12 550" />
      <main className="flex min-h-0 flex-1 flex-col gap-5 px-4 pb-5">
        <HeroBanner />
        <SportTabs tabs={SPORT_TABS} activeId={tab} onChange={setTab} />
        <CategoryStrip items={CATEGORIES} />
        <section className="flex flex-col gap-3">
          <SectionHeader title="Популярные матчи" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {POPULAR_MATCHES.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Сейчас Live"
            trailing={
              <div className="flex items-center gap-1.5 rounded-md bg-[#ef4444]/20 px-2 py-[3px]">
                <span className="size-1.5 shrink-0 rounded-full bg-[#ef4444]" aria-hidden />
                <span className="font-[family-name:var(--font-inter)] text-[10px] font-bold text-[#ef4444]">
                  {LIVE_MATCHES.length}
                </span>
              </div>
            }
          />
          <div className="flex flex-col gap-3">
            {LIVE_MATCHES.map((m) => (
              <LiveMatchRow key={m.id} match={m} />
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
