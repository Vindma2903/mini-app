import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { AuthCredentials, AuthFieldErrors } from '../../types/auth'
import { ErrorMessage } from './ErrorMessage'
import { InputField } from './InputField'
import { SubmitButton } from './SubmitButton'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface AuthFormProps {
  onSubmitCredentials: (c: AuthCredentials) => Promise<void>
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}

function validate(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {}
  const e = email.trim()
  if (!e) {
    errors.email = 'Введите email'
  } else if (!EMAIL_RE.test(e)) {
    errors.email = 'Некорректный email'
  }
  if (!password) {
    errors.password = 'Введите пароль'
  } else if (password.length < 6) {
    errors.password = 'Минимум 6 символов'
  }
  return errors
}

export function AuthForm({ onSubmitCredentials, disabled, onBusyChange }: AuthFormProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const isValid = useMemo(() => {
    const err = validate(email, password)
    return !err.email && !err.password
  }, [email, password])

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setFormError(null)
      const err = validate(email, password)
      setFieldErrors(err)
      if (err.email || err.password) return
      setLoading(true)
      onBusyChange?.(true)
      try {
        await onSubmitCredentials({ email: email.trim(), password })
      } catch (er) {
        setFormError(er instanceof Error ? er.message : 'Ошибка входа')
      } finally {
        setLoading(false)
        onBusyChange?.(false)
      }
    },
    [email, password, onBusyChange, onSubmitCredentials],
  )

  return (
    <form className="flex w-full flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <p className="text-center font-[family-name:var(--font-inter)] text-xs font-medium text-[#4b5577]">
        Вход по почте
      </p>
      <InputField
        id="auth-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputRef={emailRef}
        value={email}
        onChange={(ev) => setEmail(ev.target.value)}
        error={fieldErrors.email}
        disabled={disabled || loading}
      />
      <InputField
        id="auth-password"
        name="password"
        type="password"
        label="Пароль"
        autoComplete="current-password"
        value={password}
        onChange={(ev) => setPassword(ev.target.value)}
        error={fieldErrors.password}
        disabled={disabled || loading}
      />
      <ErrorMessage message={formError} id="auth-form-error" />
      <SubmitButton loading={loading} disabled={!isValid || disabled}>
        Войти
      </SubmitButton>
    </form>
  )
}
