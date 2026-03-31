type DataListPanelProps = {
  title: string
  description?: React.ReactNode
  kicker?: string
  children: React.ReactNode
  /** Sin padding en el cuerpo (tablas a ancho completo) */
  flush?: boolean
  /**
   * Por defecto el panel usa overflow-hidden (bordes redondeados).
   * Desactívalo si el contenido muestra tooltips/popovers que deben sobresalir (p. ej. agenda día).
   */
  clipOverflow?: boolean
}

/**
 * Contenedor de listados tipo panel clínico: cabecera gris + cuerpo con borde suave.
 */
export function DataListPanel({
  title,
  description,
  kicker,
  children,
  flush = false,
  clipOverflow = true,
}: DataListPanelProps) {
  return (
    <section
      className={`rounded-2xl border border-emerald-100/70 bg-white shadow-panel ring-1 ring-emerald-100/40 ${clipOverflow ? 'overflow-hidden' : 'overflow-visible'}`}
    >
      <div className="panel-accent-top rounded-none" aria-hidden />
      <header className="border-b border-emerald-100/50 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/40 px-5 py-4">
        {kicker && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{kicker}</p>
        )}
        <h2 className="text-base font-semibold leading-snug text-slate-900">{title}</h2>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>}
      </header>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  )
}
