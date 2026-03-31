import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../core/auth-store'
import { useMiOperativo } from '../../features/usuarios/hooks/useUsuarios'
import { APP_NAME, APP_PANEL_SUBTITLE } from '../../core/branding'
import { ROLES, ROL_LABELS, type RolId } from '../../core/constants'
import { Button } from '../ui/Button'
import {
  IconBell,
  IconBuilding,
  IconCalendar,
  IconCart,
  IconClipboard,
  IconConsultorio,
  IconCog,
  IconCreditCard,
  IconCube,
  IconDashboard,
  IconHeart,
  IconList,
  IconPaw,
  IconUserGroup,
  IconUsers,
} from '../ui/icons'

type NavEntry = {
  to: string
  label: string
  Icon: ComponentType<{ className?: string }>
  roles: readonly RolId[]
}

/** Operación diaria (todos los roles con acceso al panel). */
const NAV_CORE: NavEntry[] = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard, roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION, ROLES.SUPERADMIN] },
  { to: '/consultorio', label: 'Consultorio', Icon: IconConsultorio, roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION] },
  { to: '/clientes', label: 'Clientes', Icon: IconUsers, roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION] },
  { to: '/mascotas', label: 'Mascotas', Icon: IconPaw, roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION] },
  { to: '/citas', label: 'Citas', Icon: IconCalendar, roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION] },
  { to: '/productos', label: 'Inventario', Icon: IconCube, roles: [ROLES.ADMIN, ROLES.RECEPCION] },
  { to: '/ventas', label: 'Ventas', Icon: IconCart, roles: [ROLES.ADMIN, ROLES.RECEPCION] },
]

/** Administración de la clínica (solo admin de empresa). */
const NAV_ADMIN: NavEntry[] = [
  { to: '/usuarios', label: 'Usuarios', Icon: IconUserGroup, roles: [ROLES.ADMIN] },
  { to: '/propietarios', label: 'Propietarios', Icon: IconUsers, roles: [ROLES.ADMIN] },
  {
    to: '/planes-salud',
    label: 'Planes de salud',
    Icon: IconHeart,
    roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION],
  },
  {
    to: '/planes-suscripcion',
    label: 'Planes y suscripción',
    Icon: IconCreditCard,
    roles: [ROLES.ADMIN],
  },
  { to: '/audit', label: 'Auditoría', Icon: IconClipboard, roles: [ROLES.ADMIN] },
  { to: '/configuracion-operativa', label: 'Config. operativa', Icon: IconCog, roles: [ROLES.ADMIN] },
  { to: '/configuracion-notificaciones', label: 'Notificaciones', Icon: IconBell, roles: [ROLES.ADMIN] },
  {
    to: '/variables-clinicas',
    label: 'Variables clínicas',
    Icon: IconList,
    roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION],
  },
]

const NAV_SUPER: NavEntry[] = [
  { to: '/superadmin/empresas', label: 'Empresas', Icon: IconBuilding, roles: [ROLES.SUPERADMIN] },
  { to: '/superadmin/planes', label: 'Planes', Icon: IconCreditCard, roles: [ROLES.SUPERADMIN] },
]

function adminSectionActive(pathname: string): boolean {
  return NAV_ADMIN.some((item) => pathname === item.to || (item.to.length > 1 && pathname.startsWith(`${item.to}/`)))
}

function NavTopLink({ to, label, Icon }: Pick<NavEntry, 'to' | 'label' | 'Icon'>) {
  const location = useLocation()
  const navActive = location.pathname === to || (to.length > 1 && location.pathname.startsWith(`${to}/`))
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
        navActive
          ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-teal-50/90 text-emerald-900 shadow-inner-soft ring-1 ring-emerald-200/50'
          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200/60 hover:bg-emerald-50/40'
      }`}
    >
      <Icon className={`h-4 w-4 ${navActive ? 'text-emerald-600' : 'text-slate-400'}`} />
      <span>{label}</span>
    </Link>
  )
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const rolId = (user?.rolId ?? 0) as RolId
  const operativoClinico = rolId === ROLES.VETERINARIO || rolId === ROLES.RECEPCION
  const { data: miOperativo } = useMiOperativo({ enabled: operativoClinico })
  const sinConsultorio = operativoClinico && miOperativo != null && !miOperativo.acceso_consultorio
  const vetSinConsultorio = rolId === ROLES.VETERINARIO && miOperativo != null && !miOperativo.acceso_consultorio

  const coreNav = NAV_CORE.filter((item) => {
    if (!item.roles.includes(rolId)) return false
    if (item.to === '/consultorio' && sinConsultorio) return false
    if (item.to === '/mascotas' && vetSinConsultorio) return false
    return true
  })
  const adminNav = NAV_ADMIN.filter((item) => item.roles.includes(rolId))
  const superNav = NAV_SUPER.filter((item) => item.roles.includes(rolId))
  const [adminOpen, setAdminOpen] = useState(() => adminSectionActive(location.pathname))

  useEffect(() => {
    if (adminSectionActive(location.pathname)) setAdminOpen(true)
  }, [location.pathname])

  const welcomeName = user?.email?.split('@')[0] ?? 'Usuario'

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen app-bg">
      <header className="sticky top-0 z-30 border-b border-emerald-100/70 bg-white/92 shadow-header-bar backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-none items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <Link to="/dashboard" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-sm font-bold text-white shadow-md shadow-emerald-900/15 ring-1 ring-white/25">
              {APP_NAME.slice(0, 1).toUpperCase()}
            </span>
            <div className="leading-tight">
              <span className="block text-base font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{APP_PANEL_SUBTITLE}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-md border border-emerald-200/60 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-800/90 sm:inline">
              {ROL_LABELS[rolId] ?? 'Panel'}
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200/50 bg-gradient-to-br from-white to-emerald-50/50 text-xs font-semibold text-emerald-900 shadow-sm">
              {(welcomeName?.[0] ?? 'U').toUpperCase()}
            </span>
            <Button
              variant="ghost"
              className="rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              onClick={handleLogout}
            >
              Salir
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-none px-4 pb-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <nav className="flex flex-wrap gap-2" aria-label="Principal">
            {coreNav.map((item) => (
              <NavTopLink key={item.to} to={item.to} label={item.label} Icon={item.Icon} />
            ))}
            {adminNav.length > 0 && (
              <button
                type="button"
                onClick={() => setAdminOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
              >
                Administración {adminOpen ? '▾' : '▸'}
              </button>
            )}
          </nav>
          {adminOpen && adminNav.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 p-2 shadow-inner-soft ring-1 ring-emerald-100/50">
              {adminNav.map((item) => (
                <NavTopLink key={item.to} to={item.to} label={item.label} Icon={item.Icon} />
              ))}
            </div>
          )}
          {superNav.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-cyan-100/80 bg-gradient-to-br from-cyan-50/40 via-white to-slate-50/60 p-2 ring-1 ring-cyan-100/40">
              {superNav.map((item) => (
                <NavTopLink key={item.to} to={item.to} label={item.label} Icon={item.Icon} />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-none animate-fade-in-up px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 lg:px-10 xl:px-12 2xl:px-14">
        <Outlet />
      </main>
    </div>
  )
}
