import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../core/auth-store'
import type { RolId } from '../../core/constants'

interface RoleRouteProps {
  allowedRoles: RolId[]
  children: React.ReactNode
}

/**
 * Bloquea acceso por URL cuando el rol no está autorizado.
 */
export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const user = useAuthStore((s) => s.user)
  const rolId = user?.rolId as RolId | undefined

  if (!rolId || !allowedRoles.includes(rolId)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
