import { Link } from 'react-router-dom'
import { APP_NAME } from '../../core/branding'

export function LandingFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-emerald-100/80 bg-gradient-to-b from-white to-emerald-50/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-stone-600">
          © {year} {APP_NAME}. Todos los derechos reservados.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-emerald-800">
          <Link to="/login" className="hover:underline">
            Acceso
          </Link>
          <a href="#modulos" className="hover:underline">
            Capacidades
          </a>
          <a href="#planes" className="hover:underline">
            Planes
          </a>
        </div>
      </div>
    </footer>
  )
}
