import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../types/auth'

interface AuthState {
  user: AuthUser | null
  setUser: (user: AuthUser) => void
  setMustChangePassword: (value: boolean) => void
  logout: () => void
  isAuthenticated: () => boolean
  hasRole: (role: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      setMustChangePassword: (value) =>
        set((state) => {
          if (!state.user) return state
          return { user: { ...state.user, mustChangePassword: value } }
        }),
      logout: () => set({ user: null }),
      isAuthenticated: () => {
        return Boolean(get().user?.token)
      },
      hasRole: (role) => {
        const currentRole = (get().user?.role ?? '').trim().toUpperCase()
        if (!currentRole) return false
        const normalizedExpected = role.trim().toUpperCase()
        const expectedWithPrefix = normalizedExpected.startsWith('ROLE_')
          ? normalizedExpected
          : `ROLE_${normalizedExpected}`
        const expectedWithoutPrefix = expectedWithPrefix.replace(/^ROLE_/, '')
        const currentWithoutPrefix = currentRole.replace(/^ROLE_/, '')

        return currentRole === expectedWithPrefix || currentWithoutPrefix === expectedWithoutPrefix
      },
    }),
    { name: 'nuv-auth' }
  )
)
