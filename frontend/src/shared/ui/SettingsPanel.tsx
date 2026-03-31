type SettingsPanelProps = {
  title: string
  description?: React.ReactNode
  /** Etiqueta superior (ej. nombre de sección) */
  kicker?: string
  children: React.ReactNode
  /** Borde izquierdo de acento (estilo OkVet) */
  accent?: boolean
  /** Sección atenuada (p. ej. modo desactivado) */
  muted?: boolean
  /** Contenido extra bajo el cuerpo (tips, alertas) */
  footer?: React.ReactNode
  /** Sin padding interno (tablas a ancho completo) */
  flush?: boolean
}

/**
 * Panel de ajustes: tarjeta blanca, borde sutil, barra lateral de acento (inspiración OkVet).
 */
export function SettingsPanel({
  title,
  description,
  kicker,
  children,
  accent = true,
  muted = false,
  footer,
  flush = false,
}: SettingsPanelProps) {
  return (
    <section
      className={`
        overflow-hidden rounded-xl border border-emerald-100/70 bg-white shadow-panel ring-1 ring-emerald-100/35
        ${accent ? 'border-l-[3px] border-l-emerald-500' : ''}
        ${muted ? 'border-slate-100 bg-slate-50/60 opacity-[0.92]' : ''}
      `}
    >
      <header
        className={`border-b border-emerald-100/50 px-5 py-4 ${muted ? 'bg-slate-50/80' : 'bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/30'}`}
      >
        {kicker && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{kicker}</p>
        )}
        <h2 className="text-[15px] font-semibold leading-snug text-slate-900">{title}</h2>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>}
      </header>
      <div className={flush ? '' : 'p-5'}>{children}</div>
      {footer && <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3 text-sm text-slate-700">{footer}</div>}
    </section>
  )
}
