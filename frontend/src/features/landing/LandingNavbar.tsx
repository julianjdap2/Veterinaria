import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { APP_NAME } from '../../core/branding'

const featureLinks = [
  { href: '#modulos', title: 'Historia clínica', desc: 'Consultas, historial y seguimiento clínico.' },
  { href: '#modulos', title: 'Gestión y administración', desc: 'Clientes, mascotas, inventario y ventas.' },
  { href: '#modulos', title: 'Agenda', desc: 'Citas y coordinación del equipo.' },
  { href: '#modulos', title: 'Recordatorios', desc: 'Notificaciones y comunicación con tutores.' },
]

export function LandingNavbar() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-white/90 shadow-[0_1px_0_0_rgba(16,185,129,0.08)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <BrandLogo to="/" />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          <a
            href="#top"
            className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200/70"
          >
            Inicio
          </a>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
              aria-expanded={open}
            >
              Funcionalidades
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {open && (
              <div
                className="absolute left-0 top-full z-50 mt-2 w-[min(100vw-2rem,28rem)] rounded-2xl border border-emerald-100/90 bg-white p-4 shadow-xl ring-1 ring-emerald-100/40"
                role="menu"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {featureLinks.map((item) => (
                    <a
                      key={item.title}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-transparent p-3 transition hover:border-emerald-200 hover:bg-emerald-50/70"
                      role="menuitem"
                    >
                      <p className="font-semibold text-stone-900">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600">{item.desc}</p>
                    </a>
                  ))}
                </div>
                <a
                  href="#modulos"
                  onClick={() => setOpen(false)}
                  className="mt-3 block text-center text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
                >
                  Ver todas las funciones
                </a>
              </div>
            )}
          </div>

          <a
            href="#pro"
            className="rounded-full border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-950 to-teal-950 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-900/30 hover:from-emerald-900 hover:to-teal-900"
          >
            <span>{APP_NAME}</span>{' '}
            <span className="bg-gradient-to-r from-emerald-200 to-cyan-200 bg-clip-text font-bold text-transparent">
              Plus
            </span>
          </a>

          <span className="hidden items-center gap-1 rounded-xl px-2 py-1 text-sm text-stone-500 xl:flex">
            <span className="text-xs font-semibold uppercase text-emerald-600">Nuevo</span>
            Formación
          </span>

          <a href="#planes" className="rounded-xl px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
            Planes
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/registro"
            className="inline-flex rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-700/20 transition hover:from-emerald-700 hover:to-teal-700 sm:px-4 sm:text-sm"
          >
            Registrarse
          </Link>
          <Link
            to="/login"
            className="inline-flex rounded-2xl border-2 border-emerald-200/90 bg-white px-3 py-2 text-xs font-semibold text-emerald-950 transition hover:border-teal-300 hover:bg-emerald-50/80 sm:px-4 sm:text-sm"
          >
            Acceder
          </Link>
        </div>
      </div>
    </header>
  )
}
