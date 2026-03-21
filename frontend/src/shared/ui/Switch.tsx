/**
 * Interruptor estilo SaaS (accesible: botón con aria-pressed).
 */
export function Switch({
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors duration-200
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'border-primary-500 bg-primary-500' : 'border-slate-300 bg-slate-200'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-6 w-6 translate-y-px rounded-full bg-white shadow transition duration-200
          ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}
        `}
      />
    </button>
  )
}
