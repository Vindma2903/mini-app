import { useEffect } from 'react'
import { useToastStore } from '../stores/toastStore'

const KIND_CLASS: Record<string, string> = {
  success: 'border-[#22c55e]/40 bg-[#0f1f18]',
  info: 'border-[#8b5cf6]/40 bg-[#1a1630]',
  error: 'border-[#ef4444]/40 bg-[#2a1417]',
}

const AMOUNT_CLASS: Record<string, string> = {
  success: 'text-[#22c55e]',
  info: 'text-[#8b5cf6]',
  error: 'text-[#ef4444]',
}

export function ToastViewport(): JSX.Element | null {
  const items = useToastStore((s) => s.items)
  const remove = useToastStore((s) => s.remove)

  useEffect(() => {
    const timers = items.map((item) =>
      window.setTimeout(() => {
        remove(item.id)
      }, 3200),
    )
    return () => {
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [items, remove])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[90] mx-auto flex w-full max-w-[393px] flex-col gap-2 px-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`toast-enter pointer-events-auto rounded-xl border px-3 py-2.5 shadow-lg ${KIND_CLASS[item.kind] ?? KIND_CLASS.info}`}
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-white">{item.title}</p>
          {item.description ? <p className="mt-0.5 text-xs text-[#8b95b0]">{item.description}</p> : null}
          {item.amountLabel ? (
            <p className={`toast-amount-pop mt-1 text-sm font-bold ${AMOUNT_CLASS[item.kind] ?? AMOUNT_CLASS.info}`}>
              {item.amountLabel}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
