import { isAxiosError } from 'axios'

type ApiErrorPayload = {
  message?: string
  mensaje?: string
  error?: string
  errors?: Array<{ message?: string }>
}

const GENERIC_ERROR_MESSAGES = new Set([
  'An unexpected error occurred',
  'Unexpected error',
  'Internal Server Error',
])

const sanitizeMessage = (value?: string): string | null => {
  const text = value?.trim()
  if (!text) return null
  return GENERIC_ERROR_MESSAGES.has(text) ? null : text
}

export const parseApiError = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback

  const payload = error.response?.data
  if (typeof payload === 'string') {
    const text = sanitizeMessage(payload)
    if (text) return text
  }

  if (payload && typeof payload === 'object') {
    const data = payload as ApiErrorPayload
    const message =
      sanitizeMessage(data.message) ??
      sanitizeMessage(data.mensaje) ??
      sanitizeMessage(data.error) ??
      sanitizeMessage(Array.isArray(data.errors) ? data.errors[0]?.message : undefined)

    if (message) return message
  }

  const status = error.response?.status
  if (status === 400) return `${fallback}. Revisa los datos enviados.`
  if (status === 401) return `${fallback}. Tu sesión no es válida.`
  if (status === 403) return `${fallback}. No tienes permisos para esta acción.`
  if (status === 404) return `${fallback}. El recurso no existe o ya fue eliminado.`
  if (status === 409) return `${fallback}. Hay un conflicto con datos relacionados.`
  if (status === 422) return `${fallback}. La validación de datos falló.`
  if (status && status >= 500) return `${fallback}. Ocurrió un error interno del servidor.`

  return fallback
}
