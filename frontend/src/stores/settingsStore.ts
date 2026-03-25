import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface SettingsState {
  notificationsEnabled: boolean
  demoDataEnabled: boolean
  setNotificationsEnabled: (value: boolean) => void
  setDemoDataEnabled: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      demoDataEnabled: true,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setDemoDataEnabled: (demoDataEnabled) => set({ demoDataEnabled }),
    }),
    {
      name: 'betneon-settings',
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState as Partial<SettingsState> | undefined) ?? {}
        return {
          notificationsEnabled: state.notificationsEnabled ?? true,
          // Force ON as new default for demo mode.
          demoDataEnabled: true,
        } satisfies Pick<SettingsState, 'notificationsEnabled' | 'demoDataEnabled'>
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notificationsEnabled: state.notificationsEnabled,
        demoDataEnabled: state.demoDataEnabled,
      }),
    },
  ),
)
