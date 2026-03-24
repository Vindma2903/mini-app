import type { InputHTMLAttributes, Ref } from 'react'

export interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  id: string
  label: string
  error?: string
  inputRef?: Ref<HTMLInputElement>
}

export function InputField({
  id,
  label,
  error,
  inputRef,
  disabled,
  ...inputProps
}: InputFieldProps): JSX.Element {
  const errId = error ? `${id}-error` : undefined

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="font-[family-name:var(--font-inter)] text-xs font-medium text-[#8b95b0]">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={errId}
        className={`h-12 w-full rounded-xl bg-[#141829] px-4 font-[family-name:var(--font-inter)] text-sm text-white outline-none ring-1 ring-inset transition placeholder:text-[#4b5577] focus:ring-2 focus:ring-[#8b5cf6] disabled:opacity-50 ${
          error ? 'ring-[#ef4444]/80' : 'ring-[#2a2a2a]'
        }`}
        {...inputProps}
      />
      {error ? (
        <span id={errId} className="font-[family-name:var(--font-inter)] text-[11px] font-medium text-[#ef4444]">
          {error}
        </span>
      ) : null}
    </div>
  )
}
