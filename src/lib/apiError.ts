import { isAxiosError } from 'axios'

type ApiErrorPayload = {
  message?: string
  mensaje?: string
  error?: string
  errors?: Array<{ message?: string }>
}

export const parseApiError = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback

  const payload = error.response?.data
  if (typeof payload === 'string') return payload

  if (payload && typeof payload === 'object') {
    const data = payload as ApiErrorPayload
    if (data.message) return data.message
    if (data.mensaje) return data.mensaje
    if (data.error) return data.error
    if (Array.isArray(data.errors) && data.errors[0]?.message) return data.errors[0].message
  }

  return fallback
}
