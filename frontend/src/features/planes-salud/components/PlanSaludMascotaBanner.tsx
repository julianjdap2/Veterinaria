import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Award, Sparkles, X } from 'lucide-react'
import { fetchAfiliacionActivaMascota } from '../api'

function formatVigencia(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    return new Date(y, mo - 1, d).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  try {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return fecha
  }
}

function dismissKey(mascotaId: number, afiliacionId: number) {
  return `plan-salud-banner-dismissed:${mascotaId}:${afiliacionId}`
}

type Props = {
  mascotaId: number
  /** Si hay varias mascotas con plan, ayuda a distinguir el aviso. */
  mascotaNombre?: string | null
  /** Prefijo en el texto (ej. nombre de la mascota en consultorio). */
  etiquetaMascota?: boolean
}

export function PlanSaludMascotaBanner({ mascotaId, mascotaNombre, etiquetaMascota }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['planes-salud', 'afiliacion-mascota', mascotaId],
    queryFn: () => fetchAfiliacionActivaMascota(mascotaId),
    staleTime: 60_000,
  })

  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!data?.tiene_afiliacion || data.afiliacion_id == null) return
    try {
      if (localStorage.getItem(dismissKey(mascotaId, data.afiliacion_id)) === '1') {
        setDismissed(true)
      }
    } catch {
      /* ignore */
    }
  }, [data, mascotaId])

  function dismiss() {
    if (!data?.afiliacion_id) return
    try {
      localStorage.setItem(dismissKey(mascotaId, data.afiliacion_id), '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  if (isLoading || !data?.tiene_afiliacion || dismissed) return null
  const nombrePlan = data.plan_nombre?.trim() || 'Plan de salud'
  const vigencia = formatVigencia(data.fecha_fin ?? null)
  const cuentaHref = data.afiliacion_id != null ? `/planes-salud/cuenta/${data.afiliacion_id}` : '/planes-salud'

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-400/35 bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-600 p-[1px] shadow-lg shadow-emerald-900/20"
    >
      <motion.div
        className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent"
        animate={{ x: ['0%', '280%'] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.4 }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 rounded-[15px] bg-gradient-to-br from-slate-950/25 via-emerald-950/20 to-teal-950/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <motion.div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300/95 to-amber-500 text-amber-950 shadow-md shadow-amber-900/30 ring-2 ring-amber-200/80"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            <Award className="h-5 w-5" strokeWidth={2.25} />
          </motion.div>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white drop-shadow-sm">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
              Plan de salud activo
            </p>
            <p className="mt-1 text-sm leading-snug text-emerald-50/95">
              {etiquetaMascota && mascotaNombre ? (
                <>
                  <span className="font-semibold text-white">{mascotaNombre}</span>
                  <span className="text-emerald-100/90"> · </span>
                </>
              ) : null}
              <span className="font-medium text-white">{nombrePlan}</span>
              <span className="text-emerald-100/90"> · vigencia hasta el {vigencia}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Link
            to={cuentaHref}
            className="inline-flex items-center justify-center rounded-xl bg-white/95 px-3.5 py-2 text-xs font-semibold text-emerald-900 shadow-sm ring-1 ring-white/60 transition hover:bg-white"
          >
            Ver estado de cuenta
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-emerald-100/90 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar aviso de plan de salud"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
