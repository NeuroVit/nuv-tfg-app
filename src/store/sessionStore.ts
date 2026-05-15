import { create } from 'zustand'
import { getSession } from '@/features/auth/api/auth'
import { useAuthStore } from '@/store/authStore'
import type { SessionContext } from '@/features/auth/types/auth'

interface RefreshSessionOptions {
  withLoading?: boolean
}

interface SessionState {
  session: SessionContext | null
  loading: boolean
  refreshSession: (options?: RefreshSessionOptions) => Promise<SessionContext | null>
  clearSession: () => void
}

const mapSessionRoleToAuthRole = (role: string | null): string | null => {
  if (!role) return null
  switch (role.trim().toLowerCase()) {
    case 'owner':
      return 'ROLE_ADMIN'
    case 'admin':
      return 'ROLE_MANAGER'
    case 'member':
      return 'ROLE_VIEWER'
    default:
      return null
  }
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
      const mappedRole = mapSessionRoleToAuthRole(data.role)
      if (mappedRole) {
        const authState = useAuthStore.getState()
        const currentUser = authState.user
        if (currentUser && currentUser.role !== mappedRole) {
          authState.setUser({ ...currentUser, role: mappedRole })
        }
      }
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
