import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface SettingsState {
  notificationsEnabled: boolean
  setNotificationsEnabled: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    {
      name: 'betneon-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notificationsEnabled: state.notificationsEnabled,
      }),
    },
  ),
)
