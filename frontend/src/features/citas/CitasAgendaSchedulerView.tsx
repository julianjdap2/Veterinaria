import { useCallback, useMemo, useRef, useState } from 'react'
import type { Cita } from '../../api/types'
import { estadoCitaBadgeMeta } from './citaEstadoBadge'
import { toLocalISO } from './agendaDateUtils'
import { AgendaEventHoverPortal } from './CitaAgendaEventHover'

const SLOT_MIN = 30
/** Hora de inicio del eje (inclusiva), en horas [0-23]. */
const GRID_START_H = 6
/** Fin del eje (exclusivo): 24 = hasta 23:30. */
const GRID_END_H = 24

const GRID_START_MIN = GRID_START_H * 60
const GRID_END_MIN = GRID_END_H * 60
const TOTAL_MIN = GRID_END_MIN - GRID_START_MIN

function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function snapToSlot(totalMin: number): number {
  const snapped = Math.round(totalMin / SLOT_MIN) * SLOT_MIN
  return clamp(snapped, GRID_START_MIN, GRID_END_MIN - SLOT_MIN)
}

type VetRow = { id: number | null; label: string }

type Props = {
  diaISO: string
  citas: Cita[]
  veterinarios: { id: number; nombre: string }[]
  editable: boolean
  reprogramando: boolean
  /** Clic en la tarjeta (no navega directo a la cita). */
  onCitaClick?: (c: Cita) => void
  /** Desde el tooltip: abre el modal de opciones. */
  onAbrirOpcionesCita?: (c: Cita) => void
  onReprogramar: (payload: {
    citaId: number
    nuevaFechaISO: string
    veterinario_id: number | null
  }) => void
}

function parseStart(c: Cita): Date | null {
  if (!c.fecha) return null
  const s = new Date(c.fecha)
  return Number.isNaN(s.getTime()) ? null : s
}

function parseEnd(c: Cita, start: Date): Date {
  if (c.fecha_fin) {
    const e = new Date(c.fecha_fin)
    if (!Number.isNaN(e.getTime())) return e
  }
  return new Date(start.getTime() + SLOT_MIN * 60 * 1000)
}

export function CitasAgendaSchedulerView({
  diaISO,
  citas,
  veterinarios,
  editable,
  reprogramando,
  onCitaClick,
  onAbrirOpcionesCita,
  onReprogramar,
}: Props) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [hover, setHover] = useState<{ cita: Cita; rect: DOMRect } | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rowRefs = useRef<Map<string | number, HTMLDivElement | null>>(new Map())

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }, [])

  const scheduleHideHover = useCallback(() => {
    clearLeaveTimer()
    leaveTimer.current = setTimeout(() => setHover(null), 180)
  }, [clearLeaveTimer])

  const closeHover = useCallback(() => {
    clearLeaveTimer()
    setHover(null)
  }, [clearLeaveTimer])

  const rows: VetRow[] = useMemo(() => {
    const sorted = [...veterinarios].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
    )
    return [{ id: null, label: 'Sin asignar' }, ...sorted.map((v) => ({ id: v.id, label: v.nombre }))]
  }, [veterinarios])

  const hourLabels = useMemo(() => {
    const h: number[] = []
    for (let hr = GRID_START_H; hr < GRID_END_H; hr++) h.push(hr)
    return h
  }, [])

  const citasPorFila = useMemo(() => {
    const map = new Map<string | number, Cita[]>()
    for (const r of rows) {
      map.set(r.id ?? 'unassigned', [])
    }
    for (const c of citas) {
      const key = c.veterinario_id ?? 'unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        const ta = parseStart(a)?.getTime() ?? 0
        const tb = parseStart(b)?.getTime() ?? 0
        return ta - tb
      })
    }
    return map
  }, [citas, rows])

  function placeOnTrack(clientX: number, rowEl: HTMLDivElement | null): string | null {
    if (!rowEl) return null
    const rect = rowEl.getBoundingClientRect()
    if (rect.width <= 0) return null
    const x = clamp(clientX - rect.left, 0, rect.width)
    const ratio = x / rect.width
    const minutesInGrid = ratio * TOTAL_MIN
    const absoluteMin = GRID_START_MIN + minutesInGrid
    const snapped = snapToSlot(absoluteMin)
    return toLocalISO(
      new Date(
        new Date(`${diaISO}T00:00:00`).getTime() +
          snapped * 60 * 1000,
      ),
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex max-h-[min(78vh,900px)] flex-col overflow-auto">
        {/* Cabecera de horas */}
        <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-white">
          <div className="sticky left-0 z-30 w-40 shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            Usuarios
          </div>
          <div
            className="relative min-w-[960px] flex-1"
            style={{ minWidth: `${hourLabels.length * 56}px` }}
          >
            <div className="flex">
              {hourLabels.map((hr) => (
                <div
                  key={hr}
                  className="flex-1 border-l border-slate-100 py-2 text-center text-[11px] font-medium text-slate-500"
                >
                  {hr}
                </div>
              ))}
            </div>
          </div>
        </div>

        {rows.map((row) => {
          const key = row.id ?? 'unassigned'
          const list = citasPorFila.get(key) ?? []
          return (
            <div key={String(key)} className="flex border-b border-slate-100">
              <div className="sticky left-0 z-10 w-40 shrink-0 border-r border-slate-200 bg-slate-50/90 px-3 py-3 text-sm font-medium text-slate-800 backdrop-blur">
                {row.label}
              </div>
              <div
                ref={(el) => {
                  rowRefs.current.set(key, el)
                }}
                className={`relative min-h-[52px] min-w-[1008px] flex-1 ${
                  editable && !reprogramando ? 'bg-slate-50/30' : 'bg-white'
                }`}
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent 0, transparent calc(100% / 18 - 1px), #e2e8f0 calc(100% / 18 - 1px), #e2e8f0 calc(100% / 18))',
                }}
                onDragOver={(e) => {
                  if (!editable || reprogramando) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  if (!editable || reprogramando) return
                  e.preventDefault()
                  const raw = e.dataTransfer.getData('text/plain')
                  const citaId = parseInt(raw, 10)
                  if (!citaId) return
                  const el = rowRefs.current.get(key)
                  const nueva = placeOnTrack(e.clientX, el ?? null)
                  if (!nueva) return
                  onReprogramar({
                    citaId,
                    nuevaFechaISO: nueva,
                    veterinario_id: row.id,
                  })
                }}
              >
                {list.map((c) => {
                  const st = parseStart(c)
                  if (!st) return null
                  const en = parseEnd(c, st)
                  const startMin = minutesFromMidnight(st)
                  const endMin = Math.max(startMin + SLOT_MIN, minutesFromMidnight(en))
                  const gridStart = clamp(startMin, GRID_START_MIN, GRID_END_MIN)
                  const gridEnd = clamp(endMin, GRID_START_MIN, GRID_END_MIN)
                  const leftMin = gridStart - GRID_START_MIN
                  const spanMin = Math.max(gridEnd - gridStart, SLOT_MIN)
                  const leftPct = (leftMin / TOTAL_MIN) * 100
                  const widthPct = Math.max((spanMin / TOTAL_MIN) * 100, 0.8)

                  const owner = c.cliente_nombre?.trim() || '—'
                  const pet = c.mascota_nombre?.trim() || ''
                  const short = pet ? `${owner.slice(0, 10)} (${pet})` : owner.slice(0, 18)

                  return (
                    <div
                      key={c.id}
                      draggable={editable && !reprogramando}
                      onDragStart={(e) => {
                        if (!editable || reprogramando) return
                        closeHover()
                        e.dataTransfer.setData('text/plain', String(c.id))
                        e.dataTransfer.effectAllowed = 'move'
                        setDragId(c.id)
                      }}
                      onDragEnd={() => setDragId(null)}
                      onMouseEnter={(e) => {
                        if (dragId != null) return
                        clearLeaveTimer()
                        setHover({ cita: c, rect: e.currentTarget.getBoundingClientRect() })
                      }}
                      onMouseLeave={() => scheduleHideHover()}
                      onClick={(e) => {
                        if (reprogramando) return
                        e.stopPropagation()
                        onCitaClick?.(c)
                      }}
                      className={`absolute top-1 z-[1] max-h-[calc(100%-8px)] overflow-hidden rounded-lg border px-1.5 py-0.5 text-[10px] leading-tight shadow-sm transition ${
                        c.urgente
                          ? 'border-red-300 bg-red-50 text-red-900'
                          : 'border-violet-200 bg-violet-50 text-slate-800'
                      } ${dragId === c.id ? 'opacity-70 ring-2 ring-emerald-400' : ''} ${
                        onCitaClick ? 'cursor-pointer' : ''
                      }`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={c.motivo ?? ''}
                    >
                      <span className="block font-semibold">{short}</span>
                      {(() => {
                        const meta = estadoCitaBadgeMeta(c.estado)
                        return (
                          <span
                            className={`mt-0.5 inline-block max-w-full truncate rounded px-1 py-px text-[9px] font-semibold ring-1 ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <AgendaEventHoverPortal
        cita={hover?.cita ?? null}
        anchorRect={hover?.rect ?? null}
        open={hover != null}
        onKeepOpen={clearLeaveTimer}
        onRequestClose={closeHover}
        onAbrirOpcionesCita={onAbrirOpcionesCita}
      />
    </div>
  )
}
