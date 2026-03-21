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
        rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur shadow-card
        ${clip ? 'overflow-hidden' : 'overflow-visible'}
        transition-all duration-300 hover:shadow-card-hover
        ${className}
      `}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-primary-50/70 via-white to-white px-5 py-3.5">
          {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </div>
  )
}
