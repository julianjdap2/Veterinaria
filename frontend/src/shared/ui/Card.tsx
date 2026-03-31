interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  /** Si false, no recorta contenido (evita cortar botones en layouts con scroll interno). */
  clip?: boolean
  /** Clases del contenedor interno (por defecto `p-5`). */
  contentClassName?: string
}

export function Card({
  title,
  children,
  className = '',
  actions,
  clip = true,
  contentClassName = 'p-5',
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-emerald-100/60 bg-white/95 backdrop-blur shadow-panel
        ${clip ? 'overflow-hidden' : 'overflow-visible'}
        transition-all duration-300 hover:shadow-card-hover
        ${className}
      `}
    >
      <div className="panel-accent-top" aria-hidden />
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-emerald-100/50 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/40 px-5 py-3.5">
          {title && <h2 className="text-lg font-semibold text-emerald-950">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </div>
  )
}
