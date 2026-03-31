import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from './RootLayout'
import { ProtectedAppLayout } from './ProtectedAppLayout'
import { RoleRoute } from '../features/auth/RoleRoute'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { ActivarPage } from '../features/auth/ActivarPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { SetupWizardPage } from '../features/auth/SetupWizardPage'
import { LandingPage } from '../features/landing/LandingPage'
import { VinculoClinicaPage } from '../features/public/VinculoClinicaPage'
import { ClientesListPage } from '../features/clientes/ClientesListPage'
import { ConsultorioPage } from '../features/clientes/ConsultorioPage'
import { PropietariosListPage } from '../features/clientes/PropietariosListPage'
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
import { UsuarioEditPage } from '../features/usuarios/UsuarioEditPage'
import { AuditPage } from '../features/audit/AuditPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { SuperadminEmpresasPage } from '../features/superadmin/SuperadminEmpresasPage'
import { SuperadminPlanesPage } from '../features/superadmin/SuperadminPlanesPage'
import { ConfigOperativaPage } from '../features/empresa/ConfigOperativaPage'
import { NotificacionesConfigPage } from '../features/empresa/NotificacionesConfigPage'
import { VariablesClinicasPage } from '../features/empresa/VariablesClinicasPage'
import { PlanesSaludPage } from '../features/planes-salud/PlanesSaludPage'
import { PlanesSaludEstadoCuentaPage } from '../features/planes-salud/PlanesSaludEstadoCuentaPage'
import { AppDuenoPlaceholderPage } from '../features/planes-salud/AppDuenoPlaceholderPage'
import { PlanesSuscripcionPage } from '../features/suscripcion/PlanesSuscripcionPage'
import { ROLES } from '../core/constants'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'vinculo-clinica', element: <VinculoClinicaPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'activar', element: <ActivarPage /> },
      { path: 'registro', element: <RegisterPage /> },
      {
        path: 'configuracion-inicial',
        element: (
          <ProtectedRoute>
            <SetupWizardPage />
          </ProtectedRoute>
        ),
      },
      {
        element: <ProtectedAppLayout />,
        children: [
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
            path: 'consultorio',
            element: (
              <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
                <ConsultorioPage />
              </RoleRoute>
            ),
          },
          {
            path: 'propietarios',
            element: (
              <RoleRoute allowedRoles={[ROLES.ADMIN]}>
                <PropietariosListPage />
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
            path: 'usuarios/:id/editar',
            element: (
              <RoleRoute allowedRoles={[ROLES.ADMIN]}>
                <UsuarioEditPage />
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
          {
            path: 'variables-clinicas',
            element: (
              <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
                <VariablesClinicasPage />
              </RoleRoute>
            ),
          },
          {
            path: 'planes-salud/cuenta/:afiliacionId',
            element: (
              <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
                <PlanesSaludEstadoCuentaPage />
              </RoleRoute>
            ),
          },
          {
            path: 'planes-suscripcion',
            element: (
              <RoleRoute allowedRoles={[ROLES.ADMIN]}>
                <PlanesSuscripcionPage />
              </RoleRoute>
            ),
          },
          {
            path: 'planes-salud',
            element: (
              <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
                <PlanesSaludPage />
              </RoleRoute>
            ),
          },
          {
            path: 'app-dueno',
            element: (
              <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION]}>
                <AppDuenoPlaceholderPage />
              </RoleRoute>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
