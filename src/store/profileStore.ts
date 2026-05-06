import { create } from 'zustand'

interface ProfileState {
  displayName: string
  setDisplayName: (name: string) => void
}

export const useProfileStore = create<ProfileState>()((set) => ({
  displayName: '',
  setDisplayName: (name) => set({ displayName: name }),
}))
