import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { AppLayout } from '../shared/layout/AppLayout'

/** Rutas autenticadas: token + shell del panel + `<Outlet />` del contenido. */
export function ProtectedAppLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  )
}
