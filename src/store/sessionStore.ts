import { create } from 'zustand'
import { getSession } from '@/api/auth'
import type { SessionContext } from '@/types/auth'

interface RefreshSessionOptions {
  withLoading?: boolean
}

interface SessionState {
  session: SessionContext | null
  loading: boolean
  refreshSession: (options?: RefreshSessionOptions) => Promise<SessionContext | null>
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  loading: true,
  refreshSession: async (options) => {
    const withLoading = options?.withLoading ?? true

    if (withLoading) {
      set({ loading: true })
    }

    try {
      const data = await getSession()
      set({ session: data })
      return data
    } catch {
      set({ session: null })
      return null
    } finally {
      if (withLoading) {
        set({ loading: false })
      }
    }
  },
  clearSession: () => set({ session: null, loading: false }),
}))
