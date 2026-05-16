import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSession } from '@/features/auth/api/auth'
import { useAuthStore } from './authStore'
import { useSessionStore } from './sessionStore'

vi.mock('@/features/auth/api/auth', () => ({
  getSession: vi.fn(),
}))

const mockedGetSession = vi.mocked(getSession)

beforeEach(() => {
  mockedGetSession.mockReset()
  useAuthStore.setState({
    user: {
      username: 'javi',
      role: 'ROLE_VIEWER',
      token: 'token',
      mustChangePassword: false,
    },
  })
  useSessionStore.setState({ session: null, loading: false })
})

describe('sessionStore', () => {
  it('stores session and maps owner role to ROLE_ADMIN', async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: 1, email: 'javi@test.dev', username: 'javi' },
      organization: { id: 10, name: 'Org', slug: 'org' },
      role: 'owner',
      requiresOrganizationOnboarding: false,
    })

    const result = await useSessionStore.getState().refreshSession()

    expect(result?.role).toBe('owner')
    expect(useSessionStore.getState().session?.organization?.id).toBe(10)
    expect(useAuthStore.getState().user?.role).toBe('ROLE_ADMIN')
    expect(useSessionStore.getState().loading).toBe(false)
  })

  it('keeps loading untouched when withLoading is false', async () => {
    useSessionStore.setState({ session: null, loading: false })
    mockedGetSession.mockResolvedValue({
      user: { id: 1, email: 'javi@test.dev', username: 'javi' },
      organization: null,
      role: 'member',
      requiresOrganizationOnboarding: true,
    })

    await useSessionStore.getState().refreshSession({ withLoading: false })

    expect(useSessionStore.getState().loading).toBe(false)
    expect(useAuthStore.getState().user?.role).toBe('ROLE_VIEWER')
  })

  it('returns null and clears session on error', async () => {
    mockedGetSession.mockRejectedValue(new Error('network'))
    useSessionStore.setState({
      session: {
        user: { id: 1, email: 'javi@test.dev', username: 'javi' },
        organization: { id: 10, name: 'Org', slug: 'org' },
        role: 'admin',
        requiresOrganizationOnboarding: false,
      },
      loading: false,
    })

    const result = await useSessionStore.getState().refreshSession()

    expect(result).toBeNull()
    expect(useSessionStore.getState().session).toBeNull()
    expect(useSessionStore.getState().loading).toBe(false)
  })

  it('clears session explicitly', () => {
    useSessionStore.setState({
      session: {
        user: { id: 1, email: 'javi@test.dev', username: 'javi' },
        organization: { id: 10, name: 'Org', slug: 'org' },
        role: 'admin',
        requiresOrganizationOnboarding: false,
      },
      loading: true,
    })

    useSessionStore.getState().clearSession()

    expect(useSessionStore.getState().session).toBeNull()
    expect(useSessionStore.getState().loading).toBe(false)
  })
})
