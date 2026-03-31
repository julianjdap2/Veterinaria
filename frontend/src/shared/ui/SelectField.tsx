import { forwardRef } from 'react'

export type SelectOption = { value: string; label: string }

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  label: string
  options: SelectOption[]
  placeholder?: string
  error?: string
  hint?: string
  onChange: (value: string) => void
}

export const SelectField = forwardRef<HTMLSelectElement, Props>(
  ({ label, id, options, placeholder, error, hint, className = '', onChange, value, disabled, ...props }, ref) => {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-').replace(/[?¿]/g, '')
    return (
      <div className="w-full">
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-stone-800">
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            className={`
              w-full appearance-none rounded-xl border bg-white py-2.5 pl-3.5 pr-10 text-sm text-stone-900 shadow-sm
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-violet-500/50
              disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500
              ${error ? 'border-red-400 focus:border-red-500' : 'border-stone-300 focus:border-violet-500'}
              ${className}
            `}
            {...props}
          >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
            aria-hidden
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="opacity-70">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>
        {hint && !error && (
          <p id={`${selectId}-hint`} className="mt-1.5 text-xs text-stone-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

SelectField.displayName = 'SelectField'
