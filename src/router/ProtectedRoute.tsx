import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '../store/authStore'
import { useProfileStore } from '@/store/profileStore'
import { useSessionStore } from '@/store/sessionStore'

interface Props {
  allowedRoles?: string[]
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, isAuthenticated, hasRole } = useAuthStore()
  const setOrganizationName = useProfileStore((s) => s.setOrganizationName)
  const setProfile = useProfileStore((s) => s.setProfile)
  const session = useSessionStore((s) => s.session)
  const sessionLoading = useSessionStore((s) => s.loading)
  const refreshSession = useSessionStore((s) => s.refreshSession)
  const clearSession = useSessionStore((s) => s.clearSession)
  const location = useLocation()
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!isAuthenticated()) {
      clearSession()
      setOrganizationName('')
      setProfile(null)
      return
    }

    let cancelled = false
    lastActivityRef.current = Date.now()
    void refreshSession({ withLoading: true })

    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ]

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, updateActivity, { passive: true })
    })

    const interval = window.setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current
      if (idleTime < FIVE_MINUTES_MS || cancelled) {
        return
      }
      void refreshSession({ withLoading: false })
    }, FIVE_MINUTES_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, updateActivity)
      })
    }
  }, [clearSession, isAuthenticated, refreshSession, setOrganizationName, setProfile])

  useEffect(() => {
    setOrganizationName(session?.organization?.name ?? '')
  }, [session?.organization?.name, setOrganizationName])

  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (sessionLoading) return null

  const isOnboardingRoute = location.pathname.startsWith('/onboarding/organization')
  const requiresOrganizationOnboarding = Boolean(session?.requiresOrganizationOnboarding)
  if (requiresOrganizationOnboarding && !isOnboardingRoute) {
    return <Navigate to="/onboarding/organization" replace />
  }
  if (!requiresOrganizationOnboarding && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />
  }

  const mustChangePassword = Boolean(user?.mustChangePassword)
  const isSecurityRoute = location.pathname.startsWith('/settings/security')
  if (mustChangePassword && !isSecurityRoute) {
    return <Navigate to="/settings/security" replace />
  }

  if (allowedRoles && !allowedRoles.some(hasRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
