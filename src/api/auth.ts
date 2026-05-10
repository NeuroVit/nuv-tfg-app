import client from './client'
import { getApiBaseUrl } from './client'
import { isAxiosError } from 'axios'
import { invoke } from '@tauri-apps/api/core'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UserProfile,
  SessionContext,
  UpdateProfileRequest,
  ChangePasswordRequest,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  JoinOrganizationRequest,
  OrganizationSearchItem,
  OrganizationWithMembershipResponse,
} from '../types/auth'

export const login = (data: LoginRequest) =>
  client.post<AuthResponse>('/auth/login', data).then((r) => r.data)

export const register = (data: RegisterRequest) =>
  client.post<AuthResponse>('/auth/register', data).then((r) => r.data)

export const googleLogin = async (credential: string) => {
  const { data } = await client.post<AuthResponse>('/auth/google/verify', { credential })
  return data
}

export const consumeGoogleMobileCredential = async (ticket: string) => {
  const mobileBase = resolveMobileApiBase()
  const normalizedMobileBase = normalizeMobileApiBase(mobileBase)
  const isAndroid = /android/i.test(navigator.userAgent)
  if (isAndroid && (normalizedMobileBase.hostname === 'localhost' || normalizedMobileBase.hostname === '127.0.0.1')) {
    normalizedMobileBase.hostname = '10.0.2.2'
  }

  const baseUrl = normalizedMobileBase.toString().replace(/\/+$/, '')
  const isTauriRuntime = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  if (isTauriRuntime) {
    try {
      const credential = await invoke<string>('fetch_google_mobile_credential', {
        ticket,
        baseUrl,
      })
      if (credential) return credential
    } catch (nativeError) {
      throw new Error(
        `Native ticket redeem failed for ${baseUrl}: ${String(nativeError)}`
      )
    }
  }

  const endpointUrl = new URL(`${baseUrl}/auth/google/mobile/credential`, window.location.origin)
  endpointUrl.searchParams.set('ticket', ticket)

  try {
    const { data } = await client.get<{ credential: string }>(endpointUrl.toString())
    return data.credential
  } catch (axiosError) {
    // Fallback without credentials in case the webview blocks credentialed cross-origin requests.
    try {
      const response = await fetch(endpointUrl.toString(), {
        method: 'GET',
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        let payloadError = ''
        try {
          const payload = (await response.json()) as { error?: string; message?: string; mensaje?: string }
          payloadError = payload.message ?? payload.mensaje ?? payload.error ?? ''
        } catch {
          payloadError = ''
        }
        const suffix = payloadError ? `: ${payloadError}` : ''
        throw new Error(`HTTP ${response.status}${suffix}`)
      }

      const payload = (await response.json()) as { credential?: string }
      if (!payload.credential) {
        throw new Error('Respuesta sin credential')
      }
      return payload.credential
    } catch (fallbackError) {
      if (isAxiosError<{ error?: string; message?: string; mensaje?: string }>(axiosError)) {
        const status = axiosError.response?.status
        const payload = axiosError.response?.data
        const backendMessage = payload?.message ?? payload?.mensaje ?? payload?.error
        const statusPart = status ? `HTTP ${status}` : 'sin código HTTP'
        const backendPart = backendMessage ? ` (${backendMessage})` : ''
        const detail = axiosError.message ? `; axios=${axiosError.message}` : ''
        throw new Error(
          `No se pudo consumir ticket en ${endpointUrl.toString()} desde ${window.location.origin}: ${statusPart}${backendPart}${detail}; fallback=${String(fallbackError)}`
        )
      }

      throw new Error(
        `No se pudo consumir ticket en ${endpointUrl.toString()} desde ${window.location.origin}: ${String(
          fallbackError
        )}`
      )
    }
  }
}

const normalizeMobileApiBase = (rawBaseUrl: string) => {
  const parts = rawBaseUrl
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const candidates = (parts.length ? parts : [rawBaseUrl]).flatMap((part) => {
    const absolute = /^https?:\/\//i.test(part)
      ? part
      : `${window.location.origin}${part.startsWith('/') ? '' : '/'}${part}`
    try {
      const url = new URL(absolute)
      const callbackPathRegex = /\/api\/auth\/google\/mobile\/callback\/?$/
      if (callbackPathRegex.test(url.pathname)) {
        url.pathname = '/api'
      }
      if (!url.pathname || url.pathname === '/') {
        url.pathname = '/api'
      }
      url.search = ''
      url.hash = ''
      url.pathname = url.pathname.replace(/\/+$/, '') || '/api'
      return [url]
    } catch {
      return []
    }
  })

  if (!candidates.length) {
    throw new Error('Invalid mobile API base URL configuration')
  }

  const isLocalHost = (url: URL) => ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname)
  const preferredRemoteHttps = candidates.find((url) => url.protocol === 'https:' && !isLocalHost(url))
  const preferredHttps = candidates.find((url) => url.protocol === 'https:')
  const selected = preferredRemoteHttps ?? preferredHttps ?? candidates[0]

  return selected
}

const resolveMobileApiBase = () => {
  const explicitMobileBase = (import.meta.env.VITE_MOBILE_API_URL ?? '').toString().trim()
  if (explicitMobileBase) {
    return explicitMobileBase
  }

  const mode = (import.meta.env.VITE_MOBILE_BACKEND_MODE ?? import.meta.env.VITE_BACKEND_MODE ?? 'auto')
    .toString()
    .trim()
    .toLowerCase()
  const localMobileBase = (import.meta.env.VITE_MOBILE_API_URL_LOCAL ?? '').toString().trim()
  const railwayMobileBase = (import.meta.env.VITE_MOBILE_API_URL_RAILWAY ?? '').toString().trim()
  const fallbackBase = getApiBaseUrl()

  if (mode === 'local') return localMobileBase || fallbackBase
  if (mode === 'railway') return railwayMobileBase || fallbackBase
  if (import.meta.env.DEV) return localMobileBase || fallbackBase
  return railwayMobileBase || fallbackBase
}

export const buildGoogleMobileStartUrl = (state: string, deepLink: string) => {
  const baseUrl = resolveMobileApiBase()
  const normalizedBase = normalizeMobileApiBase(baseUrl)
  const isAndroid = /android/i.test(navigator.userAgent)
  if (isAndroid && (normalizedBase.hostname === 'localhost' || normalizedBase.hostname === '127.0.0.1')) {
    normalizedBase.hostname = '10.0.2.2'
  }

  const startUrl = new URL(normalizedBase.toString())
  const basePath = normalizedBase.pathname.replace(/\/+$/, '') || '/api'
  startUrl.pathname = `${basePath}/auth/google/mobile/start`.replace(/\/{2,}/g, '/')
  startUrl.search = ''
  startUrl.hash = ''
  startUrl.searchParams.set('state', state)
  startUrl.searchParams.set('deeplink', deepLink)
  return startUrl.toString()
}

export const logout = async () => {
  await client.post('/auth/logout')
}

export const switchRole = (role: string) =>
  client.post<AuthResponse>('/auth/role', { role }).then((r) => r.data)

export const getMe = () =>
  client.get<UserProfile>('/auth/me').then((r) => r.data)

export const updateMe = (payload: UpdateProfileRequest) =>
  client.put<UserProfile>('/auth/me', payload).then((r) => r.data)

export const changePassword = async (payload: ChangePasswordRequest) => {
  await client.post('/auth/change-password', payload)
}

export const getSession = () =>
  client.get<SessionContext>('/auth/session').then((r) => r.data)

export const createOrganization = (payload: CreateOrganizationRequest) =>
  client.post<OrganizationWithMembershipResponse>('/organizations', payload).then((r) => r.data)

export const searchOrganizations = (query: string, limit = 10) =>
  client
    .get<OrganizationSearchItem[]>('/organizations/search', { params: { query, limit } })
    .then((r) => r.data)

export const joinOrganization = (payload: JoinOrganizationRequest) =>
  client.post<OrganizationWithMembershipResponse>('/organizations/join', payload).then((r) => r.data)

export const updateCurrentOrganization = (payload: UpdateOrganizationRequest) =>
  client.put<OrganizationWithMembershipResponse>('/organizations/current', payload).then((r) => r.data)
