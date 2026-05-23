import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/api'

interface Props {
  role?: Role
}

export function RequireAuth({ role }: Props) {
  const { user, token } = useAuthStore()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Token exists but user not loaded yet (boot in flight) — render outlet,
  // useAuthBoot will fetch /me and the page can show its own skeleton.
  if (!user) {
    return <Outlet />
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
