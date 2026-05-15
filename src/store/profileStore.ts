import { useMemo } from 'react'
import { create } from 'zustand'
import type { UserProfile } from '@/features/auth/types/auth'
import { useAuthStore } from '@/store/authStore'

interface ProfileState {
  profile: UserProfile | null
  organizationName: string
  setProfile: (profile: UserProfile | null) => void
  setOrganizationName: (name: string) => void
}

export const useProfileStore = create<ProfileState>()((set) => ({
  profile: null,
  organizationName: '',
  setProfile: (profile) => set({ profile }),
  setOrganizationName: (name) => set({ organizationName: name }),
}))

export const toTitleCase = (str: string) =>
  str.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase())

/**
 * Display name for the current user, derived from the stored profile, falling
 * back to the auth username and finally a generic label.
 */
export function useDisplayName(): string {
  const profile = useProfileStore((s) => s.profile)
  const username = useAuthStore((s) => s.user?.username)
  return useMemo(() => {
    const fullName = [profile?.nombre?.trim(), profile?.apellidos?.trim()].filter(Boolean).join(' ').trim()
    return toTitleCase(fullName || username || 'Usuario')
  }, [profile?.nombre, profile?.apellidos, username])
}

export function useUserTimeZone(): string {
  const profileTimeZone = useProfileStore((s) => s.profile?.timeZone)
  return profileTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}
