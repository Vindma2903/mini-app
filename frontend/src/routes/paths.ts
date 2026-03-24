export const PATHS = {
  auth: '/auth',
  home: '/',
  live: '/live',
  bets: '/bets',
  wallet: '/wallet',
  profile: '/profile',
} as const

export type AppPath = (typeof PATHS)[keyof typeof PATHS]
