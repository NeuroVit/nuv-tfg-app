import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from '@/features/auth/types/auth'
import { useAuthStore } from '../store/authStore'

type BackendMode = 'auto' | 'local' | 'railway'

const isTauriMobileRuntime = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const isTauriRuntime = '__TAURI_INTERNALS__' in window
  const isMobileUa = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
  return isTauriRuntime && isMobileUa
}

const resolveBackendMode = (): BackendMode => {
  const rawMode = (import.meta.env.VITE_BACKEND_MODE ?? 'auto').toString().trim().toLowerCase()
  if (rawMode === 'local' || rawMode === 'railway' || rawMode === 'auto') {
    return rawMode
  }
  return 'auto'
}

const resolveConfiguredBaseUrl = () => {
  if (isTauriMobileRuntime()) {
    const explicitMobileBaseUrl = (import.meta.env.VITE_MOBILE_API_URL ?? '').toString().trim()
    if (explicitMobileBaseUrl) return explicitMobileBaseUrl

    const mobileMode = (import.meta.env.VITE_MOBILE_BACKEND_MODE ?? import.meta.env.VITE_BACKEND_MODE ?? 'auto')
      .toString()
      .trim()
      .toLowerCase()
    const localMobileBaseUrl = (import.meta.env.VITE_MOBILE_API_URL_LOCAL ?? '').toString().trim()
    const railwayMobileBaseUrl = (import.meta.env.VITE_MOBILE_API_URL_RAILWAY ?? '').toString().trim()

    if (mobileMode === 'local') return localMobileBaseUrl || '/api'
    if (mobileMode === 'railway') return railwayMobileBaseUrl || '/api'
    if (import.meta.env.DEV) return localMobileBaseUrl || railwayMobileBaseUrl || '/api'
    return railwayMobileBaseUrl || localMobileBaseUrl || '/api'
  }

  const explicitBaseUrl = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '').toString().trim()
  if (explicitBaseUrl) {
    return explicitBaseUrl
  }

  const localBaseUrl = (import.meta.env.VITE_API_URL_LOCAL ?? '').toString().trim()
  const railwayBaseUrl = (import.meta.env.VITE_API_URL_RAILWAY ?? '').toString().trim()
  const mode = resolveBackendMode()

  if (mode === 'local') return localBaseUrl || '/api'
  if (mode === 'railway') return railwayBaseUrl || '/api'
  if (import.meta.env.DEV) return localBaseUrl || railwayBaseUrl || '/api'
  return railwayBaseUrl || localBaseUrl || '/api'
}

const configuredBaseUrl = resolveConfiguredBaseUrl()
let normalizedBaseUrl = configuredBaseUrl
  ? configuredBaseUrl.endsWith('/api')
    ? configuredBaseUrl
    : `${configuredBaseUrl.replace(/\/+$/, '')}/api`
  : '/api'

if (isTauriMobileRuntime() && /android/i.test(navigator.userAgent)) {
  try {
    const resolved = new URL(normalizedBaseUrl, window.location.origin)
    if (resolved.hostname === 'localhost' || resolved.hostname === '127.0.0.1') {
      resolved.hostname = '10.0.2.2'
      normalizedBaseUrl = resolved.toString().replace(/\/+$/, '')
    }
  } catch {
    // keep normalizedBaseUrl as-is when URL parsing fails
  }
}

export const getApiBaseUrl = () => normalizedBaseUrl

const client = axios.create({
  baseURL: normalizedBaseUrl,
  withCredentials: true,
})

const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/google/verify',
  '/auth/google/mobile/credential',
  '/auth/refresh',
  '/auth/logout',
]

const isAuthEndpoint = (url?: string) =>
  !!url && AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const normalized = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

const extractAccessTokenExp = (token: string): number | null => {
  const payload = decodeJwtPayload(token)
  const exp = payload?.exp
  return typeof exp === 'number' && Number.isFinite(exp) ? exp : null
}

const isAccessTokenExpiredOrNearExpiry = (token: string, graceSeconds = 20): boolean => {
  const exp = extractAccessTokenExp(token)
  if (!exp) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  return nowSeconds >= exp - graceSeconds
}

let refreshPromise: Promise<string> | null = null

const performTokenRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = client
      .post<AuthResponse>('/auth/refresh')
      .then((response) => {
        const refreshedUser = {
          username: response.data.username,
          role: response.data.role,
          token: response.data.token,
          mustChangePassword: response.data.mustChangePassword,
        }
        useAuthStore.getState().setUser(refreshedUser)
        return response.data.token
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

client.interceptors.request.use(async (config) => {
  const path = window.location.pathname
  const isPublicRoute = path === '/login' || path === '/register'
  const isAuthCall = isAuthEndpoint(config.url)

  if (!useAuthStore.getState().isAuthenticated()) {
    if (!isPublicRoute && !isAuthCall) {
      throw new axios.CanceledError('AUTH_REQUIRED')
    }
    return config
  }

  const token = useAuthStore.getState().user?.token
  if (!token) return config

  if (!isAuthCall && isAccessTokenExpiredOrNearExpiry(token)) {
    try {
      const newToken = await performTokenRefresh()
      config.headers.Authorization = `Bearer ${newToken}`
      return config
    } catch {
      redirectToLogin()
      throw new axios.CanceledError('AUTH_REFRESH_FAILED')
    }
  }

  // Keep refresh based on secure HTTP-only cookie; don't send stale bearer here.
  if (!config.url?.includes('/auth/refresh')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const redirectToLogin = () => {
  useAuthStore.getState().logout()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

const isRedirectedApiResponseToLogin = (response: { request?: unknown; config?: unknown }): boolean => {
  const request = response.request as { responseURL?: unknown } | undefined
  const config = response.config as { url?: unknown } | undefined
  const responseUrl = typeof request?.responseURL === 'string' ? request.responseURL.toLowerCase() : ''
  const requestUrl = typeof config?.url === 'string' ? config.url.toLowerCase() : ''

  if (!requestUrl.startsWith('/')) return false
  if (isAuthEndpoint(requestUrl)) return false
  return responseUrl.endsWith('/login') || responseUrl.includes('/login?')
}

client.interceptors.response.use(
  (res) => {
    if (isRedirectedApiResponseToLogin(res)) {
      redirectToLogin()
      return Promise.reject(new axios.CanceledError('AUTH_REDIRECTED_TO_LOGIN'))
    }
    return res
  },
  async (error: AxiosError) => {
    if (axios.isCancel(error) && error.message === 'AUTH_REQUIRED') {
      redirectToLogin()
      return Promise.reject(error)
    }

    const status = error.response?.status
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error)
    }

    const requestUrl = originalRequest.url
    const isAuthCall = isAuthEndpoint(requestUrl)

    if (isAuthCall && !requestUrl?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    if (requestUrl?.includes('/auth/refresh') || originalRequest._retry) {
      redirectToLogin()
      return Promise.reject(error)
    }

    const currentUser = useAuthStore.getState().user
    if (!currentUser?.token) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const newToken = await performTokenRefresh()
      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return client(originalRequest)
    } catch (refreshError) {
      redirectToLogin()
      return Promise.reject(refreshError)
    }
  }
)

client.defaults.headers.common['ngrok-skip-browser-warning'] = 'true'

export const __clientTestUtils = {
  decodeJwtPayload,
  extractAccessTokenExp,
  isAccessTokenExpiredOrNearExpiry,
  isAuthEndpoint,
}

export default client
