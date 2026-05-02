import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from '@/types/auth'
import { useAuthStore } from '../store/authStore'

const configuredBaseUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? ''
const normalizedBaseUrl = configuredBaseUrl
  ? configuredBaseUrl.endsWith('/api')
    ? configuredBaseUrl
    : `${configuredBaseUrl.replace(/\/+$/, '')}/api`
  : '/api'

const client = axios.create({
  baseURL: normalizedBaseUrl,
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().user?.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/google/verify', '/auth/refresh', '/auth/logout']

const isAuthEndpoint = (url?: string) =>
  !!url && AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))

const redirectToLogin = () => {
  useAuthStore.getState().logout()
  window.location.href = '/login'
}

let refreshPromise: Promise<string> | null = null

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
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
