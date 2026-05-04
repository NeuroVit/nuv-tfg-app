import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '../store/authStore'

interface Props {
  allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { isAuthenticated, hasRole } = useAuthStore()
  const [heartbeat, setHeartbeat] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeartbeat((current) => current + 1)
    }, 15000)

    const onFocus = () => setHeartbeat((current) => current + 1)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  void heartbeat

  if (!isAuthenticated()) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.some(hasRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
