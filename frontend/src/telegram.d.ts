interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    auth_date: number
    hash: string
  }
  ready(): void
  close(): void
  expand(): void
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp
  }
}
