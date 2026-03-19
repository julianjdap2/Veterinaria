import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { AppLayout } from '../shared/layout/AppLayout'
import { LoginPage } from '../features/auth/LoginPage'
import { ClientesListPage } from '../features/clientes/ClientesListPage'
import { ClienteDetailPage } from '../features/clientes/ClienteDetailPage'
import { ClienteCreatePage } from '../features/clientes/ClienteCreatePage'
import { ClienteEditPage } from '../features/clientes/ClienteEditPage'
import { MascotasListPage } from '../features/mascotas/MascotasListPage'
import { MascotaDetailPage } from '../features/mascotas/MascotaDetailPage'
import { MascotaCreatePage } from '../features/mascotas/MascotaCreatePage'
import { CitasAgendaPage } from '../features/citas/CitasAgendaPage'
import { CitaCreatePage } from '../features/citas/CitaCreatePage'
import { CitaDetailPage } from '../features/citas/CitaDetailPage'
import { ConsultaCreatePage } from '../features/consultas/ConsultaCreatePage'
import { ConsultaDetailPage } from '../features/consultas/ConsultaDetailPage'
import { ProductosListPage } from '../features/productos/ProductosListPage'
import { ProductoEditPage } from '../features/productos/ProductoEditPage'
import { VentasListPage } from '../features/ventas/VentasListPage'
import { VentaNuevaPage } from '../features/ventas/VentaNuevaPage'
import { VentaDetailPage } from '../features/ventas/VentaDetailPage'
import { UsuariosListPage } from '../features/usuarios/UsuariosListPage'
import { UsuarioCreatePage } from '../features/usuarios/UsuarioCreatePage'
import { AuditPage } from '../features/audit/AuditPage'

function DashboardRedirect() {
  return <Navigate to="/clientes" replace />
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <DashboardRedirect /> },
      { path: 'clientes', element: <ClientesListPage /> },
      { path: 'clientes/nuevo', element: <ClienteCreatePage /> },
      { path: 'clientes/:id', element: <ClienteDetailPage /> },
      { path: 'clientes/:id/editar', element: <ClienteEditPage /> },
      { path: 'mascotas', element: <MascotasListPage /> },
      { path: 'mascotas/nuevo', element: <MascotaCreatePage /> },
      { path: 'mascotas/:id', element: <MascotaDetailPage /> },
      { path: 'citas', element: <CitasAgendaPage /> },
      { path: 'citas/nuevo', element: <CitaCreatePage /> },
      { path: 'citas/:id', element: <CitaDetailPage /> },
      { path: 'consultas/nuevo', element: <ConsultaCreatePage /> },
      { path: 'consultas/:id', element: <ConsultaDetailPage /> },
      { path: 'productos', element: <ProductosListPage /> },
      { path: 'productos/:id/editar', element: <ProductoEditPage /> },
      { path: 'ventas', element: <VentasListPage /> },
      { path: 'ventas/nueva', element: <VentaNuevaPage /> },
      { path: 'ventas/:id', element: <VentaDetailPage /> },
      { path: 'usuarios', element: <UsuariosListPage /> },
      { path: 'usuarios/nuevo', element: <UsuarioCreatePage /> },
      { path: 'audit', element: <AuditPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
