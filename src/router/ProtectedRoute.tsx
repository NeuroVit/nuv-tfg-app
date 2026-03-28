import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '../store/authStore'

interface Props {
  allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { isAuthenticated, hasRole } = useAuthStore()

  if (!isAuthenticated()) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.some(hasRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}