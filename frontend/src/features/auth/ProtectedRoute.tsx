import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../core/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Protege rutas que requieren autenticación.
 * Redirige a /login con state.from para volver tras login.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const token = useAuthStore((s) => s.token)

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
