interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  children: React.ReactNode
  onDismiss?: () => void
  className?: string
}

const variantClasses = {
  info: 'bg-primary-50 text-primary-900 border-primary-200',
  success: 'bg-primary-100 text-primary-900 border-primary-200',
  warning: 'bg-accent-50 text-accent-900 border-accent-200',
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
