import { create } from 'zustand'
import { useSettingsStore } from './settingsStore'

export type ToastKind = 'success' | 'info' | 'error'

export interface ToastItem {
  id: string
  title: string
  description?: string
  amountLabel?: string
  kind: ToastKind
}

interface ToastState {
  items: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => void
  remove: (id: string) => void
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export const useToastStore = create<ToastState>()((set) => ({
  items: [],
  push: (toast) => {
    if (!useSettingsStore.getState().notificationsEnabled) {
      return
    }
    set((state) => ({
      items: [{ ...toast, id: makeId() }, ...state.items].slice(0, 5),
    }))
  },
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}))
