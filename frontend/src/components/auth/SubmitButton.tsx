import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface SubmitButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  loading?: boolean
  children: ReactNode
}

export function SubmitButton({ loading, disabled, children, ...rest }: SubmitButtonProps): JSX.Element {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] font-[family-name:var(--font-inter)] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      {...rest}
    >
      {loading ? <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
}
