import { isAxiosError } from 'axios'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { buildGoogleMobileStartUrl, consumeGoogleMobileCredential, googleLogin } from '@/api/auth'
import type { AuthResponse } from '@/types/auth'

const MOBILE_GOOGLE_STATE_KEY = 'mobile_google_oauth_state'
const MOBILE_GOOGLE_STATE_KEY_PERSISTENT = 'mobile_google_oauth_state_persistent'
const MOBILE_GOOGLE_INFLIGHT_KEY = 'mobile_google_oauth_inflight'
const MOBILE_GOOGLE_DEBUG_KEY = 'mobile_google_oauth_debug_timeline'
const MOBILE_GOOGLE_DEBUG_EVENT = 'mobile-google-oauth-debug'
const MOBILE_GOOGLE_DEBUG_ENABLED = (import.meta.env.VITE_TAURI_MOBILE_GOOGLE_DEBUG ?? 'false')
  .toString()
  .trim()
  .toLowerCase() === 'true'
const MOBILE_GOOGLE_SCHEME = import.meta.env.VITE_MOBILE_DEEP_LINK_SCHEME ?? 'neurovit'
const MOBILE_GOOGLE_DEEP_LINK = `${MOBILE_GOOGLE_SCHEME}://auth/google/callback`

const processedCallbackKeys = new Set<string>()
const processingCallbackKeys = new Set<string>()

export type MobileGoogleDebugEntry = {
  at: string
  step: string
  detail?: string
}

type GoogleMobileAuthCallbacks = {
  onSuccess: (response: AuthResponse) => void | Promise<void>
  onError: (message: string) => void
}

const generateState = () => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const getExpectedState = () =>
  sessionStorage.getItem(MOBILE_GOOGLE_STATE_KEY) ||
  localStorage.getItem(MOBILE_GOOGLE_STATE_KEY_PERSISTENT)

const setExpectedState = (state: string) => {
  sessionStorage.setItem(MOBILE_GOOGLE_STATE_KEY, state)
  localStorage.setItem(MOBILE_GOOGLE_STATE_KEY_PERSISTENT, state)
}

const clearExpectedState = () => {
  sessionStorage.removeItem(MOBILE_GOOGLE_STATE_KEY)
  localStorage.removeItem(MOBILE_GOOGLE_STATE_KEY_PERSISTENT)
}

const isAuthInFlight = () => localStorage.getItem(MOBILE_GOOGLE_INFLIGHT_KEY) === '1'
const setAuthInFlight = () => localStorage.setItem(MOBILE_GOOGLE_INFLIGHT_KEY, '1')
const clearAuthInFlight = () => localStorage.removeItem(MOBILE_GOOGLE_INFLIGHT_KEY)

const appendDebug = (step: string, detail?: string) => {
  if (!MOBILE_GOOGLE_DEBUG_ENABLED) return

  const entry: MobileGoogleDebugEntry = {
    at: new Date().toISOString(),
    step,
    detail,
  }

  const prev = getMobileGoogleDebugTimeline()
  const next = [...prev, entry].slice(-30)
  sessionStorage.setItem(MOBILE_GOOGLE_DEBUG_KEY, JSON.stringify(next))

  window.dispatchEvent(new CustomEvent(MOBILE_GOOGLE_DEBUG_EVENT, { detail: entry }))
  console.info('[mobile-google-debug]', entry)
}

export const getMobileGoogleDebugTimeline = (): MobileGoogleDebugEntry[] => {
  if (!MOBILE_GOOGLE_DEBUG_ENABLED) return []

  const raw = sessionStorage.getItem(MOBILE_GOOGLE_DEBUG_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        at: typeof item.at === 'string' ? item.at : new Date().toISOString(),
        step: typeof item.step === 'string' ? item.step : 'unknown',
        detail: typeof item.detail === 'string' ? item.detail : undefined,
      }))
  } catch {
    return []
  }
}

export const clearMobileGoogleDebugTimeline = () => {
  if (!MOBILE_GOOGLE_DEBUG_ENABLED) return
  sessionStorage.removeItem(MOBILE_GOOGLE_DEBUG_KEY)
}

export { MOBILE_GOOGLE_DEBUG_EVENT }
export { MOBILE_GOOGLE_DEBUG_ENABLED }

export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const isTauriMobile = () => {
  if (!isTauri()) return false
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent)
}

const parseCallbackUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== `${MOBILE_GOOGLE_SCHEME}:`) return null
    if (url.host !== 'auth' || url.pathname !== '/google/callback') return null
    return url
  } catch {
    return null
  }
}

const parseApiErrorMessage = (error: unknown, fallback: string) => {
  if (!isAxiosError<{ error?: string; message?: string; mensaje?: string }>(error)) {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }

  const status = error.response?.status
  const payload = error.response?.data
  const backendMessage = payload?.message ?? payload?.mensaje ?? payload?.error
  const statusPart = status ? `HTTP ${status}` : 'sin código HTTP'
  return backendMessage ? `${statusPart}: ${backendMessage}` : statusPart
}

const processDeepLink = async (rawUrl: string, callbacks: GoogleMobileAuthCallbacks) => {
  appendDebug('deeplink_received', rawUrl)
  const callbackUrl = parseCallbackUrl(rawUrl)
  if (!callbackUrl) {
    appendDebug('deeplink_ignored', 'URL ignorada por no coincidir con callback esperado')
    return
  }

  const status = callbackUrl.searchParams.get('status')
  const callbackState = callbackUrl.searchParams.get('state') ?? ''
  const expectedState = getExpectedState() ?? ''
  const ticket = callbackUrl.searchParams.get('ticket') ?? ''
  const callbackKey = `${status ?? ''}|${callbackState}|${ticket}`

  if (processedCallbackKeys.has(callbackKey)) {
    appendDebug('deeplink_duplicate_ignored', callbackKey)
    return
  }
  if (processingCallbackKeys.has(callbackKey)) {
    appendDebug('deeplink_inflight_duplicate_ignored', callbackKey)
    return
  }

  processingCallbackKeys.add(callbackKey)

  try {

    if (!expectedState || callbackState !== expectedState) {
      if (!expectedState) {
        appendDebug('state_missing_stale_deeplink_ignored', callbackState || '(vacío)')
        clearAuthInFlight()
        return
      }
      appendDebug(
        'state_validation_failed',
        `expected=${expectedState || '(vacío)'} received=${callbackState || '(vacío)'}`
      )
      callbacks.onError('No se pudo validar la sesión de Google. Inténtalo de nuevo.')
      clearExpectedState()
      clearAuthInFlight()
      return
    }

    appendDebug('state_validated', callbackState)

    if (status !== 'success') {
      const errorCode = callbackUrl.searchParams.get('error') ?? 'unknown_error'
      appendDebug('oauth_status_error', `status=${status ?? '(vacío)'} error=${errorCode}`)
      callbacks.onError('Google canceló o rechazó la autenticación.')
      clearExpectedState()
      clearAuthInFlight()
      return
    }

    processedCallbackKeys.add(callbackKey)
    appendDebug('oauth_status_success', callbackKey)

    let credential = callbackUrl.searchParams.get('credential')
    if (!credential && ticket) {
      appendDebug('ticket_redeem_start', ticket)
      try {
        credential = await consumeGoogleMobileCredential(ticket)
        appendDebug('ticket_redeem_success', `credential_length=${credential.length}`)
      } catch (error) {
        const detail = parseApiErrorMessage(error, 'falló consumeGoogleMobileCredential')
        appendDebug('ticket_redeem_failed', detail)
        clearExpectedState()
        clearAuthInFlight()
        callbacks.onError(`No se pudo recuperar la credencial móvil de Google (${detail}).`)
        return
      }
    }

    if (!credential) {
      appendDebug('credential_missing', 'No llegó credential ni ticket válido')
      callbacks.onError('Google no devolvió credenciales válidas.')
      clearExpectedState()
      clearAuthInFlight()
      return
    }

    appendDebug('google_verify_start', `credential_length=${credential.length}`)
    try {
      const auth = await googleLogin(credential)
      appendDebug('google_verify_success', auth.username)
      clearExpectedState()
      clearAuthInFlight()
      await callbacks.onSuccess(auth)
    } catch (error) {
      const detail = parseApiErrorMessage(error, 'falló googleLogin/verify')
      appendDebug('google_verify_failed', detail)
      clearExpectedState()
      clearAuthInFlight()
      callbacks.onError(`Error al iniciar sesión con Google (${detail})`)
    }
  } finally {
    processingCallbackKeys.delete(callbackKey)
  }
}

export const startTauriMobileGoogleLogin = async () => {
  clearMobileGoogleDebugTimeline()
  const state = generateState()
  setExpectedState(state)
  setAuthInFlight()
  const startUrl = buildGoogleMobileStartUrl(state, MOBILE_GOOGLE_DEEP_LINK)
  appendDebug('oauth_start', `state=${state} url=${startUrl}`)

  try {
    await invoke('plugin:opener|open_url', { url: startUrl })
    appendDebug('oauth_start_opened', 'plugin:opener|open_url')
    return
  } catch (error) {
    appendDebug('oauth_start_opener_failed', String(error))
    console.error('Tauri opener failed, using fallback', error)
  }

  const opener = (window as Window & { __TAURI__?: { opener?: { openUrl?: (url: string) => Promise<void> } } }).__TAURI__
    ?.opener
    ?.openUrl

  if (opener) {
    await opener(startUrl)
    appendDebug('oauth_start_opened', '__TAURI__.opener.openUrl')
    return
  }

  appendDebug('oauth_start_opened', 'window.location.assign')
  window.location.assign(startUrl)
}

export const registerTauriMobileGoogleListener = async (
  callbacks: GoogleMobileAuthCallbacks
): Promise<UnlistenFn> => {
  const initialUrls = await invoke<string[] | null>('plugin:deep-link|get_current')
  appendDebug('listener_registered', `initial_urls=${initialUrls?.length ?? 0}`)

  const expectedState = getExpectedState()
  const shouldProcessInitialUrls = !!expectedState || isAuthInFlight()
  if (!shouldProcessInitialUrls && initialUrls?.length) {
    appendDebug('initial_urls_skipped_no_auth_inflight', String(initialUrls.length))
  }

  if (initialUrls?.length && shouldProcessInitialUrls) {
    for (const url of initialUrls) {
      await processDeepLink(url, callbacks)
    }
  }

  return listen<string[]>('deep-link://new-url', async (event) => {
    appendDebug('listener_event', `payload_urls=${event.payload?.length ?? 0}`)
    for (const url of event.payload ?? []) {
      await processDeepLink(url, callbacks)
    }
  })
}
