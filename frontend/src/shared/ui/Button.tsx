import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
  className?: string
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-button hover:shadow-button-hover focus:ring-primary-500/60 border-transparent active:scale-[0.98] hover:from-primary-700 hover:to-primary-600',
  secondary:
    'bg-white/70 text-primary-800 hover:bg-primary-50 hover:text-primary-900 focus:ring-primary-400/60 border-primary-200/70 shadow-button-hover active:scale-[0.98]',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent active:scale-[0.98]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={props.type ?? 'button'}
        disabled={disabled ?? loading}
        className={`
          inline-flex items-center justify-center border font-medium
          focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <span
              className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
            />
            <span>Espera...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
