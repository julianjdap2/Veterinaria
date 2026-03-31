import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { Cita } from '../../api/types'
import { estadoCitaBadgeMeta } from './citaEstadoBadge'

function formatDetalleFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '—'
  }
}

function tituloCita(c: Cita): string {
  const owner = c.cliente_nombre?.trim() || 'Propietario'
  const pet = c.mascota_nombre?.trim() || (c.mascota_id != null ? `Mascota #${c.mascota_id}` : 'Sin mascota')
  const tipo = c.motivo?.trim() || 'Cita'
  return `${owner} (${pet}) — ${tipo}`
}

type DetailCardProps = {
  c: Cita
  /** Si se define, el pie abre el modal de opciones (agenda) en lugar de ir a la ficha de la cita. */
  onAbrirOpciones?: (c: Cita) => void
}

/** Contenido del detalle (tarjeta blanca + enlace), reutilizable en tooltip fijo o anclado. */
export function CitaAgendaEventDetailCard({ c, onAbrirOpciones }: DetailCardProps) {
  const st = estadoCitaBadgeMeta(c.estado)
  const desc = c.notas?.trim() || c.motivo?.trim() || '—'
  const encargado = c.veterinario_nombre?.trim() || '—'

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-left shadow-xl shadow-slate-900/10 ring-1 ring-slate-100">
      <p className="text-sm font-bold leading-snug text-slate-900">{tituloCita(c)}</p>
      <div className="mt-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${st.className}`}
        >
          {st.label}
        </span>
      </div>
      <dl className="mt-3 space-y-2 text-xs text-slate-600">
        <div>
          <dt className="font-semibold text-slate-500">Encargado</dt>
          <dd className="text-slate-800">{encargado}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Descripción</dt>
          <dd className="line-clamp-4 text-slate-800">{desc}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Inicia</dt>
          <dd className="capitalize text-slate-800">{formatDetalleFecha(c.fecha)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Finaliza</dt>
          <dd className="capitalize text-slate-800">{formatDetalleFecha(c.fecha_fin)}</dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-slate-100 pt-2">
        {onAbrirOpciones ? (
          <button
            type="button"
            onClick={() => onAbrirOpciones(c)}
            className="text-left text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            Ver opciones del evento →
          </button>
        ) : (
          <Link
            to={`/citas/${c.id}`}
            state={{ from: '/citas' }}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            Abrir ficha de la cita →
          </Link>
        )}
      </div>
    </div>
  )
}

/** Panel flotante anclado bajo un bloque padre (agenda antigua por slots). */
export function CitaAgendaEventDetailPanel({ c }: { c: Cita }) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-[calc(100%-4px)] z-[90] w-[min(100vw-2rem,22rem)] -translate-x-1/2 pt-2">
      <div className="relative">
        <CitaAgendaEventDetailCard c={c} />
        <div
          className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-slate-200/90 bg-white"
          aria-hidden
        />
      </div>
    </div>
  )
}

type PortalProps = {
  cita: Cita | null
  anchorRect: DOMRect | null
  open: boolean
  onKeepOpen: () => void
  onRequestClose: () => void
  /** Abre el mismo modal de opciones que el clic en el evento; cierra el tooltip después. */
  onAbrirOpcionesCita?: (c: Cita) => void
}

const VIEWPORT_PAD = 10
const GAP = 8
/** Altura aproximada del contenido; si no cabe abajo, se abre arriba del evento. */
const EST_POPOVER_H = 280

type TooltipLayout = {
  left: number
  top: number
  transform: string
  arrow: 'top' | 'bottom'
}

function computeTooltipLayout(anchor: DOMRect): TooltipLayout {
  const centerX = anchor.left + anchor.width / 2
  const left = Math.min(
    window.innerWidth - VIEWPORT_PAD,
    Math.max(VIEWPORT_PAD, centerX),
  )

  const spaceBelow = window.innerHeight - anchor.bottom - VIEWPORT_PAD
  const spaceAbove = anchor.top - VIEWPORT_PAD

  const below = (): TooltipLayout => ({
    left,
    top: anchor.bottom,
    transform: `translate(-50%, ${GAP}px)`,
    arrow: 'top',
  })
  const above = (): TooltipLayout => ({
    left,
    top: anchor.top,
    transform: `translate(-50%, calc(-100% - ${GAP}px))`,
    arrow: 'bottom',
  })

  if (spaceBelow >= EST_POPOVER_H) return below()
  if (spaceAbove >= EST_POPOVER_H) return above()
  if (spaceBelow >= spaceAbove) return below()
  return above()
}

/**
 * Tooltip de detalle en `document.body` (FullCalendar/programador no permiten overflow visible en el DOM interno).
 * Coloca el panel arriba o abajo del evento según espacio en viewport para evitar recortes.
 */
export function AgendaEventHoverPortal({
  cita,
  anchorRect,
  open,
  onKeepOpen,
  onRequestClose,
  onAbrirOpcionesCita,
}: PortalProps) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  if (!open || !cita || !anchorRect) return null

  const layout = computeTooltipLayout(anchorRect)

  return createPortal(
    <div
      className="pointer-events-none fixed z-[300] w-[min(calc(100vw-2rem),22rem)] max-w-[22rem]"
      style={{
        left: layout.left,
        top: layout.top,
        transform: layout.transform,
      }}
    >
      <div
        className={`pointer-events-auto relative ${layout.arrow === 'top' ? 'pt-2' : 'pb-2'}`}
        onMouseEnter={() => {
          if (closeTimer.current) {
            clearTimeout(closeTimer.current)
            closeTimer.current = null
          }
          onKeepOpen()
        }}
        onMouseLeave={() => {
          closeTimer.current = setTimeout(() => onRequestClose(), 180)
        }}
      >
        <div className="relative">
          <div className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain rounded-2xl">
            <CitaAgendaEventDetailCard
              c={cita}
              onAbrirOpciones={
                onAbrirOpcionesCita
                  ? (cc) => {
                      onAbrirOpcionesCita(cc)
                      onRequestClose()
                    }
                  : undefined
              }
            />
          </div>
          {layout.arrow === 'top' ? (
            <div
              className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-slate-200/90 bg-white"
              aria-hidden
            />
          ) : (
            <div
              className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-r border-b border-slate-200/90 bg-white"
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
