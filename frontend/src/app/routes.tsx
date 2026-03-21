import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { RoleRoute } from '../features/auth/RoleRoute'
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
import { VentaPosPage } from '../features/ventas/VentaPosPage'
import { UsuariosListPage } from '../features/usuarios/UsuariosListPage'
import { UsuarioCreatePage } from '../features/usuarios/UsuarioCreatePage'
import { AuditPage } from '../features/audit/AuditPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { SuperadminEmpresasPage } from '../features/superadmin/SuperadminEmpresasPage'
import { SuperadminPlanesPage } from '../features/superadmin/SuperadminPlanesPage'
import { ConfigOperativaPage } from '../features/empresa/ConfigOperativaPage'
import { NotificacionesConfigPage } from '../features/empresa/NotificacionesConfigPage'
import { ROLES } from '../core/constants'

function DashboardRedirect() {
  return <Navigate to="/dashboard" replace />
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
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'superadmin/empresas',
        element: (
          <RoleRoute allowedRoles={[ROLES.SUPERADMIN]}>
            <SuperadminEmpresasPage />
          </RoleRoute>
        ),
      },
      {
        path: 'superadmin/planes',
        element: (
          <RoleRoute allowedRoles={[ROLES.SUPERADMIN]}>
            <SuperadminPlanesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'clientes',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <ClientesListPage />
          </RoleRoute>
        ),
      },
      {
        path: 'clientes/nuevo',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <ClienteCreatePage />
          </RoleRoute>
        ),
      },
      {
        path: 'clientes/:id',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <ClienteDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'clientes/:id/editar',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <ClienteEditPage />
          </RoleRoute>
        ),
      },
      {
        path: 'mascotas',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <MascotasListPage />
          </RoleRoute>
        ),
      },
      {
        path: 'mascotas/nuevo',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <MascotaCreatePage />
          </RoleRoute>
        ),
      },
      {
        path: 'mascotas/:id',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <MascotaDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'citas',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <CitasAgendaPage />
          </RoleRoute>
        ),
      },
      {
        path: 'citas/nuevo',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCION]}>
            <CitaCreatePage />
          </RoleRoute>
        ),
      },
      {
        path: 'citas/:id',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <CitaDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'consultas/nuevo',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <ConsultaCreatePage />
          </RoleRoute>
        ),
      },
      {
        path: 'consultas/:id',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
            <ConsultaDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'productos',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCION]}>
            <ProductosListPage />
          </RoleRoute>
        ),
      },
      {
        path: 'productos/:id/editar',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCION]}>
            <ProductoEditPage />
          </RoleRoute>
        ),
      },
      {
        path: 'ventas',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCION]}>
            <VentasListPage />
          </RoleRoute>
        ),
      },
      {
        path: 'ventas/pos',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCION]}>
            <VentaPosPage />
          </RoleRoute>
        ),
      },
      {
        path: 'ventas/nueva',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCION]}>
            <VentaNuevaPage />
          </RoleRoute>
        ),
      },
      {
        path: 'ventas/:id',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPCION]}>
            <VentaDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'usuarios',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <UsuariosListPage />
          </RoleRoute>
        ),
      },
      {
        path: 'usuarios/nuevo',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <UsuarioCreatePage />
          </RoleRoute>
        ),
      },
      {
        path: 'audit',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <AuditPage />
          </RoleRoute>
        ),
      },
      {
        path: 'configuracion-operativa',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <ConfigOperativaPage />
          </RoleRoute>
        ),
      },
      {
        path: 'configuracion-notificaciones',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <NotificacionesConfigPage />
          </RoleRoute>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
