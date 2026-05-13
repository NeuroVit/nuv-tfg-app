import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from '@/types/auth'
import { useAuthStore } from '../store/authStore'

type BackendMode = 'auto' | 'local' | 'railway'

const resolveBackendMode = (): BackendMode => {
  const rawMode = (import.meta.env.VITE_BACKEND_MODE ?? 'auto').toString().trim().toLowerCase()
  if (rawMode === 'local' || rawMode === 'railway' || rawMode === 'auto') {
    return rawMode
  }
  return 'auto'
}

const resolveConfiguredBaseUrl = () => {
  const explicitBaseUrl = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '').toString().trim()
  if (explicitBaseUrl) {
    return explicitBaseUrl
  }

  const localBaseUrl = (import.meta.env.VITE_API_URL_LOCAL ?? 'http://localhost:8080/api').toString().trim()
  const railwayBaseUrl = (import.meta.env.VITE_API_URL_RAILWAY ?? '').toString().trim()
  const mode = resolveBackendMode()

  if (mode === 'local') return localBaseUrl
  if (mode === 'railway') return railwayBaseUrl || localBaseUrl
  if (import.meta.env.DEV) return localBaseUrl
  return railwayBaseUrl || localBaseUrl
}

const configuredBaseUrl = resolveConfiguredBaseUrl()
const normalizedBaseUrl = configuredBaseUrl
  ? configuredBaseUrl.endsWith('/api')
    ? configuredBaseUrl
    : `${configuredBaseUrl.replace(/\/+$/, '')}/api`
  : '/api'

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

client.interceptors.request.use((config) => {
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
  if (token) {
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

let refreshPromise: Promise<string> | null = null

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

      const newToken = await refreshPromise
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

export default client
