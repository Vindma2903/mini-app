import { StatusBar } from '../components/StatusBar'

export interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps): JSX.Element {
  return (
    <>
      <StatusBar />
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 pb-8 pt-4 text-center">
        <h1 className="font-[family-name:var(--font-sora)] text-xl font-bold text-white">{title}</h1>
        <p className="font-[family-name:var(--font-inter)] text-sm text-[#8b95b0]">Раздел скоро будет доступен</p>
      </main>
    </>
  )
}
