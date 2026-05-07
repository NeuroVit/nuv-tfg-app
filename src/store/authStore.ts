import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../types/auth'

const decodeBase64Url = (value: string): string | null => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return atob(padded)
  } catch {
    return null
  }
}

const getTokenExpiryMs = (token: string): number | null => {
  const parts = token.split('.')
  if (parts.length < 2) return null
  const payload = decodeBase64Url(parts[1])
  if (!payload) return null

  try {
    const decoded = JSON.parse(payload) as { exp?: number }
    if (typeof decoded.exp !== 'number') return null
    return decoded.exp * 1000
  } catch {
    return null
  }
}

const isTokenExpired = (token: string): boolean => {
  const expiry = getTokenExpiryMs(token)
  if (!expiry) return false
  return Date.now() >= expiry
}

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
        const token = get().user?.token
        if (!token) return false
        if (isTokenExpired(token)) {
          set({ user: null })
          return false
        }
        return true
      },
      hasRole: (role) => get().user?.role === role,
    }),
    { name: 'nuv-auth' }
  )
)
