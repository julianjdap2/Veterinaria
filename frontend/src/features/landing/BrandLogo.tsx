import { Link } from 'react-router-dom'
import { APP_NAME } from '../../core/branding'

type Props = {
  className?: string
  to?: string
}

/** Marca en cabecera landing (nombre configurable vía `VITE_APP_NAME`). */
export function BrandLogo({ className = '', to = '/' }: Props) {
  const letter = APP_NAME.trim().charAt(0).toUpperCase() || 'V'
  const inner = (
    <>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-sm font-bold text-white shadow-md shadow-emerald-900/15 ring-2 ring-emerald-300/35"
        aria-hidden
      >
        {letter}
      </span>
      <span className={`text-lg font-bold tracking-tight text-stone-900 ${className}`}>{APP_NAME}</span>
    </>
  )
  if (to) {
    return (
      <Link
        to={to}
        className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {inner}
      </Link>
    )
  }
  return <span className="flex items-center gap-2.5">{inner}</span>
}
