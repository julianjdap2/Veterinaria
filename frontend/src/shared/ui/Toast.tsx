/**
 * Toast individual y contenedor global.
 * Muestra notificaciones efímeras (éxito, error, info, aviso).
 */

import { useToastStore, type ToastItem, type ToastType } from '../../core/toast-store'

const typeStyles: Record<ToastType, string> = {
  success: 'bg-primary-600 text-white border-primary-700 shadow-lg shadow-primary-900/20',
  error: 'bg-red-600 text-white border-red-700 shadow-lg shadow-red-900/20',
  info: 'bg-primary-700 text-white border-primary-800 shadow-lg shadow-primary-900/25',
  warning: 'bg-accent-600 text-white border-accent-700 shadow-lg shadow-accent-900/20',
}

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

function ToastItemComponent({ item }: { item: ToastItem }) {
  const remove = useToastStore((s) => s.remove)

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 animate-slide-in-right ${typeStyles[item.type]}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
        {typeIcons[item.type]}
      </span>
      <p className="flex-1 text-sm font-semibold">{item.message}</p>
      <button
        type="button"
        onClick={() => remove(item.id)}
        className="shrink-0 rounded-lg p-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed right-4 top-4 z-[9999] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <ToastItemComponent key={item.id} item={item} />
      ))}
    </div>
  )
}
