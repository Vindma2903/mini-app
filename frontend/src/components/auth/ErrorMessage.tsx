export interface ErrorMessageProps {
  message: string | null
  id?: string
}

export function ErrorMessage({ message, id }: ErrorMessageProps): JSX.Element | null {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className="font-[family-name:var(--font-inter)] text-xs font-medium text-[#ef4444]"
    >
      {message}
    </p>
  )
}
