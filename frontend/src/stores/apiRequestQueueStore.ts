import { create } from 'zustand'

export type ApiRequestStatus = 'in_progress' | 'retry' | 'success' | 'error'

export interface ApiRequestQueueItem {
  id: string
  method: string
  url: string
  status: ApiRequestStatus
  attempt: number
  startedAtIso: string
  finishedAtIso?: string
  errorMessage?: string
  retryInSeconds?: number
}

interface ApiRequestQueueState {
  items: ApiRequestQueueItem[]
  enqueue: (params: { method: string; url: string }) => string
  markAttemptStart: (id: string, attempt: number) => void
  markRetry: (id: string, retryInSeconds: number, nextAttempt: number, errorMessage: string) => void
  markSuccess: (id: string) => void
  markError: (id: string, errorMessage: string) => void
  clear: () => void
}

const MAX_ITEMS = 200

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export const useApiRequestQueueStore = create<ApiRequestQueueState>()((set) => ({
  items: [],
  enqueue: ({ method, url }) => {
    const id = makeId()
    const item: ApiRequestQueueItem = {
      id,
      method,
      url,
      status: 'in_progress',
      attempt: 1,
      startedAtIso: new Date().toISOString(),
    }
    set((state) => ({ items: [item, ...state.items].slice(0, MAX_ITEMS) }))
    return id
  },
  markAttemptStart: (id, attempt) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'in_progress',
              attempt,
              retryInSeconds: undefined,
            }
          : item,
      ),
    }))
  },
  markRetry: (id, retryInSeconds, nextAttempt, errorMessage) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'retry',
              attempt: nextAttempt,
              retryInSeconds,
              errorMessage,
            }
          : item,
      ),
    }))
  },
  markSuccess: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'success',
              finishedAtIso: new Date().toISOString(),
              retryInSeconds: undefined,
            }
          : item,
      ),
    }))
  },
  markError: (id, errorMessage) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'error',
              finishedAtIso: new Date().toISOString(),
              errorMessage,
              retryInSeconds: undefined,
            }
          : item,
      ),
    }))
  },
  clear: () => set({ items: [] }),
}))
