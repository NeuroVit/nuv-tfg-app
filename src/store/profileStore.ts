import { create } from 'zustand'

interface ProfileState {
  displayName: string
  organizationName: string
  setDisplayName: (name: string) => void
  setOrganizationName: (name: string) => void
}

export const useProfileStore = create<ProfileState>()((set) => ({
  displayName: '',
  organizationName: '',
  setDisplayName: (name) => set({ displayName: name }),
  setOrganizationName: (name) => set({ organizationName: name }),
}))
