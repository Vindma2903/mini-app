import { ArrowLeft, Mail, MessageCircleQuestion, Phone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBar } from '../components/StatusBar'

export function ProfileSupportPage(): JSX.Element {
  const navigate = useNavigate()

  return (
    <>
      <StatusBar />
      <header className="flex h-14 w-full shrink-0 items-center gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-9 items-center justify-center rounded-xl bg-[#141829] text-[#8b95b0]"
          aria-label="Назад"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={2.25} aria-hidden />
        </button>
        <h1 className="font-[family-name:var(--font-sora)] text-[22px] font-bold leading-none tracking-[-0.5px] text-white">
          Поддержка
        </h1>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
        <section className="rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#1c2036]">
          <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">FAQ</h2>
          <ul className="mt-2 flex list-none flex-col gap-2 p-0">
            <li className="rounded-xl bg-[#1c2036] px-3 py-2.5">
              <p className="text-sm font-semibold text-white">Это реальный кошелек?</p>
              <p className="mt-1 text-xs text-[#8b95b0]">Нет, это игровой баланс в демо-режиме.</p>
            </li>
            <li className="rounded-xl bg-[#1c2036] px-3 py-2.5">
              <p className="text-sm font-semibold text-white">Почему нет live-матчей?</p>
              <p className="mt-1 text-xs text-[#8b95b0]">
                Иногда у провайдера временно нет активных матчей или обновление задерживается.
              </p>
            </li>
            <li className="rounded-xl bg-[#1c2036] px-3 py-2.5">
              <p className="text-sm font-semibold text-white">Как работает вывод?</p>
              <p className="mt-1 text-xs text-[#8b95b0]">
                Вывод уменьшает только демо-баланс внутри игры, реальные платежи не используются.
              </p>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#1c2036]">
          <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">Контакты</h2>
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-[#1c2036] px-3 py-2.5">
              <Mail className="size-4 text-[#8b95b0]" aria-hidden />
              <span className="text-sm text-white">support@betneon.app</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[#1c2036] px-3 py-2.5">
              <Phone className="size-4 text-[#8b95b0]" aria-hidden />
              <span className="text-sm text-white">+7 (900) 000-00-00</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[#1c2036] px-3 py-2.5">
              <MessageCircleQuestion className="size-4 text-[#8b95b0]" aria-hidden />
              <span className="text-sm text-white">@betneon_support</span>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
