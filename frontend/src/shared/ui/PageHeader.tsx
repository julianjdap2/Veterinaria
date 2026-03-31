import { Link } from 'react-router-dom'

export type BreadcrumbItem = { label: string; to?: string }

type PageHeaderProps = {
  title: string
  subtitle?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  /** Botones u otras acciones a la derecha (p. ej. “Nuevo”) */
  actions?: React.ReactNode
  /** Badge o etiqueta pequeña junto a las acciones */
  badge?: React.ReactNode
}

/**
 * Cabecera de página estilo panel clínico (migas + título + descripción).
 */
export function PageHeader({ title, subtitle, breadcrumbs, actions, badge }: PageHeaderProps) {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-emerald-100/70 bg-white/95 shadow-panel ring-1 ring-emerald-100/40">
      <div className="panel-accent-top rounded-none" aria-hidden />
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {breadcrumbs.map((b, i) => (
              <span key={`${b.label}-${i}`} className="flex items-center gap-2">
                {i > 0 && <span className="font-normal text-emerald-200">/</span>}
                {b.to ? (
                  <Link to={b.to} className="text-slate-500 transition hover:text-emerald-700">
                    {b.label}
                  </Link>
                ) : (
                  <span className="font-medium text-emerald-900/90">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="border-l-[3px] border-emerald-500 pl-3 text-xl font-bold tracking-tight text-slate-900 sm:border-l-4 sm:pl-4 sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <div className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{subtitle}</div>
            )}
          </div>
          {(actions || badge) && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {badge}
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
