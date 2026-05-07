import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '../store/authStore'
import { getSession } from '@/api/auth'
import type { SessionContext } from '@/types/auth'
import { useProfileStore } from '@/store/profileStore'

interface Props {
  allowedRoles?: string[]
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, isAuthenticated, hasRole } = useAuthStore()
  const setOrganizationName = useProfileStore((s) => s.setOrganizationName)
  const location = useLocation()
  const [session, setSession] = useState<SessionContext | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const lastActivityRef = useRef<number>(Date.now())
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchSession = useCallback(async (withLoading: boolean) => {
    if (withLoading && isMountedRef.current) {
      setSessionLoading(true)
    }

    try {
      const data = await getSession()
      if (isMountedRef.current) {
        setSession(data)
        setOrganizationName(data.organization?.name ?? '')
      }
    } catch {
      if (isMountedRef.current) {
        setSession(null)
        setOrganizationName('')
      }
    } finally {
      if (withLoading && isMountedRef.current) {
        setSessionLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      setSession(null)
      setSessionLoading(false)
      setOrganizationName('')
      return
    }

    let cancelled = false
    lastActivityRef.current = Date.now()
    void fetchSession(true)

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
      void fetchSession(false)
    }, FIVE_MINUTES_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, updateActivity)
      })
    }
  }, [fetchSession, isAuthenticated, setOrganizationName])

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
