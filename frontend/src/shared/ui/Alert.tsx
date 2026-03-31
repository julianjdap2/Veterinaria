interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  children: React.ReactNode
  onDismiss?: () => void
  className?: string
}

const variantClasses = {
  info: 'bg-emerald-50 text-emerald-950 border-emerald-200/90',
  success: 'bg-teal-50 text-teal-950 border-teal-200/90',
  warning: 'bg-amber-50 text-amber-950 border-amber-200',
  error: 'bg-red-50 text-red-900 border-red-200',
}

export function Alert({
  variant = 'info',
  children,
  onDismiss,
  className = '',
}: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-2 rounded-xl border p-3.5 text-sm font-medium ${variantClasses[variant]} ${className}`}
    >
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1"
          aria-label="Cerrar"
        >
          ✕
        </button>
      )}
    </div>
  )
}
