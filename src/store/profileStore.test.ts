import { afterEach, describe, expect, it } from 'vitest'
import { toTitleCase, useProfileStore } from './profileStore'

afterEach(() => {
  useProfileStore.setState({ profile: null, organizationName: '' })
})

describe('profileStore', () => {
  it('updates profile and organization name', () => {
    const setProfile = useProfileStore.getState().setProfile
    const setOrganizationName = useProfileStore.getState().setOrganizationName

    setProfile({
      id: 1,
      username: 'javi',
      email: 'javi@test.dev',
      nombre: 'javier',
      apellidos: 'fernandez',
      role: 'ADMIN',
      activo: true,
      avatarUrl: null,
      mustChangePassword: false,
      timeZone: 'Europe/Madrid',
    })
    setOrganizationName('Neural Stock')

    const state = useProfileStore.getState()
    expect(state.profile?.username).toBe('javi')
    expect(state.organizationName).toBe('Neural Stock')
  })

  it('formats title case names', () => {
    expect(toTitleCase('jAvIeR fErNaNdEz')).toBe('Javier Fernandez')
  })
})
