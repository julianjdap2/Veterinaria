import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../core/auth-store'
import { ROLES, ROL_LABELS, type RolId } from '../../core/constants'
import { Button } from '../ui/Button'
import { BannerMascot } from '../ui/BannerMascot'

type NavEntry = { to: string; label: string; roles: readonly RolId[] }

/** Una sola definición de menú; se filtra por rol (evita duplicar listas por rol). */
const NAV_ITEMS: NavEntry[] = [
  { to: '/dashboard', label: 'Dashboard', roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION, ROLES.SUPERADMIN] },
  { to: '/clientes', label: 'Clientes', roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION] },
  { to: '/mascotas', label: 'Mascotas', roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION] },
  { to: '/citas', label: 'Citas', roles: [ROLES.ADMIN, ROLES.VETERINARIO, ROLES.RECEPCION] },
  { to: '/productos', label: 'Inventario', roles: [ROLES.ADMIN, ROLES.RECEPCION] },
  { to: '/ventas', label: 'Ventas', roles: [ROLES.ADMIN, ROLES.RECEPCION] },
  { to: '/usuarios', label: 'Usuarios', roles: [ROLES.ADMIN] },
  { to: '/audit', label: 'Auditoría', roles: [ROLES.ADMIN] },
  { to: '/configuracion-operativa', label: 'Config. operativa', roles: [ROLES.ADMIN] },
  { to: '/configuracion-notificaciones', label: 'Notificaciones', roles: [ROLES.ADMIN] },
  { to: '/superadmin/empresas', label: 'Empresas', roles: [ROLES.SUPERADMIN] },
  { to: '/superadmin/planes', label: 'Planes', roles: [ROLES.SUPERADMIN] },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const rolId = (user?.rolId ?? 0) as RolId
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(rolId))
  const welcomeName = user?.email?.split('@')[0] ?? 'Usuario'

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex app-bg">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-white/80 backdrop-blur border-r border-slate-200/70 shadow-card">
        <div className="p-5 border-b border-slate-100">
          <Link
            to="/"
            className="group flex items-center gap-2 text-xl font-bold text-primary-700 tracking-tight transition-all duration-300 hover:text-primary-600 hover:drop-shadow-sm"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600 text-sm font-bold transition-all duration-300 group-hover:bg-accent-100 group-hover:text-accent-700 group-hover:scale-105">
              V
            </span>
            Vet System
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Principal">
          {navItems.map(({ to, label }) => {
            const isActive = location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`
                  flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium
                  transition-all duration-200 ease-out
                  motion-safe:hover:translate-x-0.5
                  ${isActive
                    ? 'bg-primary-50 text-primary-700 shadow-inner-soft border-l-2 border-l-primary-500 -ml-0.5 pl-3.5'
                    : `text-slate-600 border-l-2 border-l-transparent
                       hover:bg-gradient-to-r hover:from-primary-50/90 hover:to-accent-50/40
                       hover:text-primary-800 hover:border-l-primary-400 hover:shadow-sm
                       active:scale-[0.99]`
                  }
                `}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <p className="text-xs font-medium text-slate-500 truncate" title={user?.email}>
            {user?.email ?? 'Usuario'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{ROL_LABELS[rolId] ?? '—'}</p>
          <Button
            variant="ghost"
            className="mt-3 w-full justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main: banner + content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 text-white px-6 py-3 shadow-card">
          <p className="relative z-10 text-sm font-medium opacity-95">
            Bienvenido, <span className="font-semibold">{welcomeName}</span>
          </p>
          <BannerMascot />
        </header>

        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
