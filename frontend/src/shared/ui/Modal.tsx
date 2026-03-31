import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  /** Texto o badge debajo del título (p. ej. peso de la mascota). */
  subtitle?: ReactNode
  onClose: () => void
  children: React.ReactNode
  /** Ancho máximo del panel (por defecto ~2xl). `wide` aprovecha casi todo el ancho útil (formularios clínicos). */
  size?: 'md' | 'lg' | 'xl' | '2xl' | 'wide'
  /** Si es false, no se muestra «Cerrar» en la cabecera (p. ej. botón al pie). */
  headerClose?: boolean
  /** Botón de cierre en cabecera: texto o solo icono. */
  headerCloseStyle?: 'text' | 'icon'
  /**
   * Si es false, el cuerpo no hace scroll (p. ej. formularios con tabs y altura fija).
   * Por defecto true.
   */
  scrollableBody?: boolean
  /** Clases Tailwind extra para el panel del diálogo (p. ej. altura máxima). */
  panelClassName?: string
  /** Sobrescribe estilos del `<h3>` del título (p. ej. modal compacto). */
  titleClassName?: string
  /**
   * Pie fijo visible sin desplazarse (acciones). El cuerpo hace scroll solo si hace falta.
   * Útil en formularios largos tipo consulta/fórmula.
   */
  footer?: React.ReactNode
}

const sizeClass: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
  /** ~88–92% del viewport (referencia tipo Okvet: formularios clínicos amplios). */
  wide: 'w-full max-w-[min(1680px,calc(100vw-2.5rem))]',
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  size = 'lg',
  headerClose = true,
  headerCloseStyle = 'text',
  scrollableBody = true,
  panelClassName = '',
  titleClassName = '',
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[400] flex items-start justify-center overflow-y-auto bg-slate-950/65 px-3 py-5 backdrop-blur-[3px] sm:items-center sm:px-6 sm:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden
        >
          <motion.div
            className={`my-auto flex w-full ${sizeClass[size]} max-h-[min(92vh,1120px)] flex-col overflow-hidden rounded-xl border border-emerald-100/90 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.06] ${panelClassName}`}
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="panel-accent-top rounded-none" aria-hidden />
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-emerald-100/55 bg-gradient-to-r from-emerald-50/35 via-white to-teal-50/25 px-3 py-2.5 sm:px-4">
              <div className="min-w-0 flex-1 pr-2">
                <h3
                  id="modal-title"
                  className={`text-sm font-semibold leading-snug text-emerald-950 sm:text-[0.9375rem] ${titleClassName}`.trim()}
                >
                  {title}
                </h3>
                {subtitle ? (
                  <div className="mt-1 text-xs font-medium text-slate-500">{subtitle}</div>
                ) : null}
              </div>
              {headerClose ? (
                headerCloseStyle === 'icon' ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-lg border border-emerald-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-emerald-900 shadow-sm hover:bg-emerald-50/90"
                  >
                    Cerrar
                  </button>
                )
              ) : (
                <span className="w-px shrink-0" aria-hidden />
              )}
            </div>
            <div
              className={
                scrollableBody
                  ? `min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-5 ${footer ? 'pb-2 sm:pb-3' : ''}`
                  : `flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 ${footer ? 'pb-2.5' : ''}`
              }
            >
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-slate-100/90 bg-slate-50/40 px-3 py-2 sm:px-4">{footer}</div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
