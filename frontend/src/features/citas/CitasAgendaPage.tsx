import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useCitasAgenda } from './hooks/useCitasAgenda'
import {
  fetchCitasAgenda,
  fetchCitasDisponibilidad,
  updateCita,
  fetchListaEspera,
  promoteListaEspera,
  discardListaEspera,
  callListaEspera,
  promoteNextListaEspera,
} from './api'
import { useVeterinarios } from '../usuarios/hooks/useUsuarios'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { Pagination } from '../../shared/ui/Pagination'
import { AGENDA_CITA_DIA_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '../../core/constants'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'revision', label: 'En curso' },
  { value: 'atendida', label: 'Finalizada' },
  { value: 'cancelada', label: 'Cancelada' },
] as const

/** Etiqueta y estilos de pastilla para estado de cita (tabla y vista día). */
function estadoCitaBadgeMeta(estado: string | null | undefined): { label: string; className: string } {
  const e = estado ?? 'pendiente'
  if (e === 'atendida') {
    return { label: 'Finalizada', className: 'bg-emerald-100 text-emerald-800 ring-emerald-300' }
  }
  if (e === 'cancelada') {
    return { label: 'Cancelada', className: 'bg-red-100 text-red-800 ring-red-300' }
  }
  if (e === 'confirmada') {
    return { label: 'Confirmada', className: 'bg-sky-100 text-sky-800 ring-sky-300' }
  }
  if (e === 'revision') {
    return { label: 'En curso', className: 'bg-primary-100 text-primary-800 ring-primary-300' }
  }
  return { label: 'Pendiente', className: 'bg-slate-100 text-slate-700 ring-slate-300' }
}

function formatDateTime(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return s
  }
}

function waitMinutesFrom(createdAt: string | null): number {
  if (!createdAt) return 0
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 60000))
}

export function CitasAgendaPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [estado, setEstado] = useState('')
  const [soloEnSalaEspera, setSoloEnSalaEspera] = useState(false)
  const prevEstadoBeforeSalaRef = useRef<string | null>(null)
  const [misCitas, setMisCitas] = useState(false)
  const [vistaCalendarioDia, setVistaCalendarioDia] = useState(false)

  const isVet = user?.rolId === ROLES.VETERINARIO

  const today = new Date().toISOString().slice(0, 10)
  const [fechaCalendarioDia, setFechaCalendarioDia] = useState(today)
  const [mostrarDisponibilidad, setMostrarDisponibilidad] = useState(false)
  const [fechaDisponibilidad, setFechaDisponibilidad] = useState(today)
  const [vetDisponibilidadId, setVetDisponibilidadId] = useState<string>(() => (isVet ? String(user?.userId ?? '') : ''))

  useEffect(() => {
    if (isVet && user?.userId) {
      setVetDisponibilidadId(String(user.userId))
    }
  }, [isVet, user?.userId])

  useEffect(() => {
    if (soloEnSalaEspera) {
      if (prevEstadoBeforeSalaRef.current === null) {
        prevEstadoBeforeSalaRef.current = estado
      }
      // Reducimos ruido: para "en sala de espera" el estado más útil es confirmada.
      if (!estado || !['confirmada', 'revision'].includes(estado)) {
        setEstado('confirmada')
      }
      setPage(1)
      return
    }

    // Restauramos el estado previo cuando se desactiva el filtro.
    if (prevEstadoBeforeSalaRef.current !== null) {
      setEstado(prevEstadoBeforeSalaRef.current)
      prevEstadoBeforeSalaRef.current = null
      setPage(1)
    }
  }, [soloEnSalaEspera, estado])

  const puedeAsignarVet = user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION
  const { data: veterinarios = [] } = useVeterinarios({ enabled: puedeAsignarVet })

  const filters = {
    page,
    page_size: pageSize,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
    estado: estado || undefined,
    veterinario_id: isVet && misCitas && user?.userId ? user.userId : undefined,
    en_sala_espera: soloEnSalaEspera || undefined,
  }
  const { data, isLoading, isError, error } = useCitasAgenda(filters)

  const vetDisponibilidadNum = vetDisponibilidadId ? parseInt(vetDisponibilidadId, 10) : null
  const puedeReprogramar = user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION
  const { data: disponibilidad, isLoading: loadingDisp } = useQuery({
    queryKey: ['citas', 'disponibilidad', fechaDisponibilidad, vetDisponibilidadNum],
    queryFn: () => fetchCitasDisponibilidad(fechaDisponibilidad, vetDisponibilidadNum as number),
    enabled: mostrarDisponibilidad && !!fechaDisponibilidad && vetDisponibilidadNum != null,
  })

  const efectivoVetCalendario = isVet ? (user?.userId ?? null) : vetDisponibilidadNum

  const { data: citasDia, isLoading: loadingCitasDia } = useQuery({
    queryKey: ['citas', 'calendario_dia', fechaCalendarioDia, efectivoVetCalendario],
    queryFn: () =>
      fetchCitasAgenda({
        page: 1,
        page_size: AGENDA_CITA_DIA_PAGE_SIZE,
        fecha_desde: `${fechaCalendarioDia}T00:00:00`,
        fecha_hasta: `${fechaCalendarioDia}T23:59:59`,
        veterinario_id: efectivoVetCalendario as number,
      }),
    enabled: vistaCalendarioDia && efectivoVetCalendario != null && (isVet || puedeReprogramar),
  })

  const { data: disponibilidadDia, isLoading: loadingDispDia } = useQuery({
    queryKey: ['citas', 'disponibilidad', fechaCalendarioDia, efectivoVetCalendario],
    queryFn: () => fetchCitasDisponibilidad(fechaCalendarioDia, efectivoVetCalendario as number),
    enabled: vistaCalendarioDia && efectivoVetCalendario != null,
  })

  const { data: listaEspera = [], isLoading: loadingWaitlist } = useQuery({
    queryKey: ['citas', 'waitlist', fechaCalendarioDia, efectivoVetCalendario],
    queryFn: () =>
      fetchListaEspera(fechaCalendarioDia, efectivoVetCalendario as number, false, false),
    enabled: vistaCalendarioDia && efectivoVetCalendario != null && puedeReprogramar,
  })

  const SLOT_MINUTES = 30
  const JORNADA_INICIO_MIN = 8 * 60
  const JORNADA_FIN_MIN = 18 * 60 + 30

  function minutesToSlotLabel(totalMinutes: number): string {
    const hh = Math.floor(totalMinutes / 60)
    const mm = totalMinutes % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const slotsDia = useMemo(() => {
    const slots: string[] = []
    for (let m = JORNADA_INICIO_MIN; m <= JORNADA_FIN_MIN; m += SLOT_MINUTES) {
      slots.push(minutesToSlotLabel(m))
    }
    return slots
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function slotLabelFromISO(iso: string | null): string | null {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    const totalMinutes = d.getHours() * 60 + d.getMinutes()
    const rounded = Math.floor(totalMinutes / SLOT_MINUTES) * SLOT_MINUTES
    return minutesToSlotLabel(rounded)
  }

  function startOfWeekISO(today: string): string {
  const d = new Date(`${today}T12:00:00`)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dayN = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dayN}`
}

function endOfWeekISOFromStart(start: string): string {
  const d = new Date(`${start}T12:00:00`)
  d.setDate(d.getDate() + 6)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dayN = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dayN}`
}

function addDaysISO(iso: string, deltaDays: number): string {
    const d = new Date(`${iso}T00:00:00`)
    d.setDate(d.getDate() + deltaDays)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const citasDiaItems = citasDia?.items ?? []
  /** Nombres de mascota ya resueltos en las citas del día (para lista de espera sin request extra). */
  const nombresMascotasDesdeCitasDia = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of citasDiaItems) {
      if (c.mascota_nombre) m.set(c.mascota_id, c.mascota_nombre)
    }
    return m
  }, [citasDiaItems])
  const reservedSlots = new Set(disponibilidadDia?.reservado ?? [])

  const citasPorSlot = useMemo(() => {
    const map: Record<string, typeof citasDiaItems> = {}
    for (const s of slotsDia) map[s] = []
    for (const c of citasDiaItems) {
      const slot = slotLabelFromISO(c.fecha)
      if (slot && map[slot]) map[slot].push(c)
    }
    // Priorización visual simple: urgentes primero dentro de cada slot.
    for (const s of slotsDia) {
      map[s].sort((a, b) => {
        const urgA = a.urgente ? 1 : 0
        const urgB = b.urgente ? 1 : 0
        if (urgA !== urgB) return urgB - urgA
        return (a.id ?? 0) - (b.id ?? 0)
      })
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citasDiaItems, slotsDia])

  const [draggingCitaId, setDraggingCitaId] = useState<number | null>(null)

  const reprogramarMutation = useMutation({
    mutationFn: (payload: { citaId: number; nuevaFechaISO: string; veterinario_id: number | null }) =>
      updateCita(payload.citaId, { fecha: payload.nuevaFechaISO, veterinario_id: payload.veterinario_id }),
    onSuccess: () => {
      toast.success('Cita reprogramada')
      queryClient.invalidateQueries({ queryKey: ['citas', 'agenda'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'disponibilidad'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'calendario_dia'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'waitlist'] })
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al reprogramar'
      toast.error(msg)
    },
  })

  const promoteWaitlistMutation = useMutation({
    mutationFn: (entryId: number) => promoteListaEspera(entryId),
    onSuccess: () => {
      toast.success('Entrada promovida y cita creada')
      queryClient.invalidateQueries({ queryKey: ['citas', 'agenda'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'disponibilidad'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'calendario_dia'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'waitlist'] })
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al promover entrada'
      toast.error(msg)
    },
  })

  const discardWaitlistMutation = useMutation({
    mutationFn: (entryId: number) => discardListaEspera(entryId),
    onSuccess: () => {
      toast.success('Entrada descartada')
      queryClient.invalidateQueries({ queryKey: ['citas', 'waitlist'] })
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al descartar entrada'
      toast.error(msg)
    },
  })

  const callWaitlistMutation = useMutation({
    mutationFn: (entryId: number) => callListaEspera(entryId),
    onSuccess: () => {
      toast.success('Mascota llamada')
      queryClient.invalidateQueries({ queryKey: ['citas', 'waitlist'] })
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al marcar como llamada'
      toast.error(msg)
    },
  })

  const promoteNextWaitlistMutation = useMutation({
    mutationFn: () => promoteNextListaEspera(fechaCalendarioDia, efectivoVetCalendario as number),
    onSuccess: () => {
      toast.success('Siguiente de la cola asignado')
      queryClient.invalidateQueries({ queryKey: ['citas', 'agenda'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'disponibilidad'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'calendario_dia'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'waitlist'] })
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo asignar el siguiente'
      toast.error(msg)
    },
  })

  const checkInMutation = useMutation({
    mutationFn: (citaId: number) => updateCita(citaId, { estado: 'confirmada' }),
    onSuccess: () => {
      toast.success('Check-in registrado')
      queryClient.invalidateQueries({ queryKey: ['citas', 'agenda'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'calendario_dia'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'disponibilidad'] })
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al confirmar llegada'
      toast.error(msg)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agenda de citas</h1>
        {!isVet && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setVistaCalendarioDia((v) => !v)
                setMostrarDisponibilidad(false)
              }}
            >
              {vistaCalendarioDia ? 'Ver lista' : 'Calendario'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setMostrarDisponibilidad((v) => !v)}
            >
              {mostrarDisponibilidad ? 'Ocultar' : 'Ver citas'}
            </Button>
            <Button
              variant={soloEnSalaEspera ? 'primary' : 'secondary'}
              onClick={() => {
                setSoloEnSalaEspera((v) => !v)
                setPage(1)
              }}
            >
              Solo en sala de espera
            </Button>
            <Link to="/citas/nuevo">
              <Button>Nueva cita</Button>
            </Link>
          </div>
        )}
      </div>

      <Card title="Citas">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[170px]">
              <label className="mb-1 block text-sm font-medium text-gray-700">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              />
            </div>

            <div className="min-w-[170px]">
              <label className="mb-1 block text-sm font-medium text-gray-700">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              />
            </div>

            {isVet && (
              <label className="flex items-center gap-2 pb-1 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={misCitas}
                  onChange={(e) => {
                    setMisCitas(e.target.checked)
                    setPage(1)
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Mis citas
              </label>
            )}

            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                {ESTADOS.map((e) => {
                  const active = estado === e.value
                  return (
                    <button
                      key={e.value || 'all'}
                      type="button"
                      onClick={() => {
                        setEstado(e.value)
                        setPage(1)
                      }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                        active
                          ? 'bg-primary-600 text-white ring-primary-600'
                          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {e.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <Button
                variant="secondary"
                type="button"
                className="h-9 text-xs"
                onClick={() => {
                  setFechaDesde('')
                  setFechaHasta('')
                  setPage(1)
                }}
              >
                Limpiar fechas
              </Button>
              <Button
                variant="secondary"
                type="button"
                className="h-9 text-xs"
                onClick={() => {
                  const s = startOfWeekISO(today)
                  setFechaDesde(s)
                  setFechaHasta(endOfWeekISOFromStart(s))
                  setPage(1)
                }}
              >
                Esta semana
              </Button>
            </div>
          </div>

          {!isVet && mostrarDisponibilidad && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur p-4 shadow-card">
              <div className="flex flex-wrap items-end gap-4">
                <Input
                  type="date"
                  label="Fecha"
                  value={fechaDisponibilidad}
                  onChange={(e) => setFechaDisponibilidad(e.target.value)}
                  min={today}
                  className="max-w-[180px]"
                />

                {!isVet && (
                  <div className="min-w-[220px]">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Veterinario</label>
                    <select
                      value={vetDisponibilidadId}
                      onChange={(e) => setVetDisponibilidadId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
                    >
                      <option value="">Seleccionar veterinario</option>
                      {veterinarios.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-4">
                {loadingDisp ? (
                  <p className="text-sm text-gray-500">Cargando horarios...</p>
                ) : !disponibilidad ? (
                  <p className="text-sm text-gray-500">Selecciona fecha y veterinario.</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Reservadas: {disponibilidad.reservado.length ? disponibilidad.reservado.join(', ') : '—'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {disponibilidad.disponible.length ? (
                        disponibilidad.disponible.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              navigate('/citas/nuevo', {
                                state: {
                                  fecha: `${fechaDisponibilidad}T${t}:00`,
                                  veterinarioId: vetDisponibilidadNum,
                                },
                              })
                            }
                            className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100 transition-colors"
                          >
                            {t}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No hay horarios disponibles.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {isError && (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Error al cargar citas'}
            </p>
          )}
          {!vistaCalendarioDia && isLoading && <p className="text-sm text-gray-500">Cargando...</p>}

          {vistaCalendarioDia ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur p-4 shadow-card">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-end gap-2">
                  {!isVet && (
                    <Button
                      variant="secondary"
                      onClick={() => setFechaCalendarioDia((d) => addDaysISO(d, -1))}
                      disabled={reprogramarMutation.isPending}
                    >
                      Anterior
                    </Button>
                  )}
                  <Input
                    type="date"
                    label="Día"
                    value={fechaCalendarioDia}
                    onChange={(e) => setFechaCalendarioDia(e.target.value)}
                    min={today}
                    className="max-w-[180px]"
                  />
                  {!isVet && (
                    <Button
                      variant="secondary"
                      onClick={() => setFechaCalendarioDia((d) => addDaysISO(d, 1))}
                      disabled={reprogramarMutation.isPending}
                    >
                      Siguiente
                    </Button>
                  )}
                </div>

                {!isVet && (
                  <div className="min-w-[220px]">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Veterinario</label>
                    <select
                      value={vetDisponibilidadId}
                      onChange={(e) => setVetDisponibilidadId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
                    >
                      <option value="">Seleccionar veterinario</option>
                      {veterinarios.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-4">
                {loadingCitasDia || loadingDispDia ? (
                  <p className="text-sm text-gray-500">Cargando calendario...</p>
                ) : !efectivoVetCalendario ? (
                  <p className="text-sm text-gray-500">Selecciona fecha y veterinario.</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Reservados: {disponibilidadDia?.reservado?.length ?? 0} | Libres: {disponibilidadDia?.disponible?.length ?? 0}
                    </p>
                    <div className="space-y-2">
                      {slotsDia.map((slot) => (
                      <div key={slot} className="grid grid-cols-[80px_1fr] gap-2 items-start">
                        <div className="pt-2 text-xs font-semibold text-gray-600">{slot}</div>
                        <div
                          className={`min-h-[42px] rounded-xl border p-2 transition-colors ${
                            reservedSlots.has(slot)
                              ? citasPorSlot[slot]?.length
                                ? 'border-primary-200 bg-primary-50/40'
                                : 'border-red-200 bg-red-50/30'
                              : 'border-slate-200/80 bg-white/40'
                          } ${puedeReprogramar ? 'cursor-grab' : 'cursor-not-allowed'}`}
                          onDragOver={(e) => {
                            if (!puedeReprogramar || reprogramarMutation.isPending) return
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                          }}
                          onDrop={(e) => {
                            if (!puedeReprogramar || reprogramarMutation.isPending) return
                            e.preventDefault()
                            const raw = e.dataTransfer.getData('text/plain')
                            if (!raw) return
                            const citaId = parseInt(raw, 10)
                            if (!citaId) return
                            const cita = citasDiaItems.find((c) => c.id === citaId)
                            if (!cita) return

                            const fromSlot = slotLabelFromISO(cita.fecha)
                            if (reservedSlots.has(slot) && fromSlot !== slot) {
                              toast.warning('Ese horario ya está reservado')
                              return
                            }

                            const nuevaFechaISO = `${fechaCalendarioDia}T${slot}:00`
                            reprogramarMutation.mutate({
                              citaId,
                              nuevaFechaISO,
                              veterinario_id: cita.veterinario_id ?? efectivoVetCalendario,
                            })
                          }}
                        >
                          {(citasPorSlot[slot] ?? []).length ? (
                            <div className="space-y-2">
                              {citasPorSlot[slot].map((c) => (
                                <div
                                  key={c.id}
                                  draggable={puedeReprogramar && !reprogramarMutation.isPending}
                                  onDragStart={(e) => {
                                    if (!puedeReprogramar || reprogramarMutation.isPending) return
                                    setDraggingCitaId(c.id)
                                    e.dataTransfer.setData('text/plain', String(c.id))
                                  }}
                                  onDragEnd={() => setDraggingCitaId(null)}
                                  className={`select-none rounded-lg border px-2 py-1.5 ${
                                    draggingCitaId === c.id
                                      ? 'border-primary-400 bg-primary-50'
                                      : 'border-primary-200 bg-white/70'
                                  }`}
                                  title="Arrastra para reprogramar"
                                >
                                  <div className="text-[12px] font-semibold text-slate-800">
                                    {c.mascota_nombre ?? `Mascota #${c.mascota_id}`}
                                  </div>
                                  <div className="text-[11px] text-slate-600 truncate">{c.motivo ?? '—'}</div>
                                  {(() => {
                                    const st = estadoCitaBadgeMeta(c.estado)
                                    return (
                                      <span
                                        className={`mt-0.5 inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${st.className}`}
                                      >
                                        {st.label}
                                      </span>
                                    )
                                  })()}
                                  {c.urgente ? (
                                    <div className="text-[10px] font-bold text-red-700">URGENTE</div>
                                  ) : null}
                                  {c.en_sala_espera ? (
                                    <div className="text-[10px] font-semibold text-amber-700">EN SALA DE ESPERA</div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 pt-1">Libre</div>
                          )}
                        </div>
                      </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <details className="mt-4 rounded-xl border border-slate-200/70 bg-white/70 backdrop-blur shadow-card group">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-800 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    Lista de espera
                    <span className="text-xs font-normal text-slate-500 group-open:hidden">
                      (expandir)
                    </span>
                  </span>
                  <span className="text-slate-400 text-xs">▼</span>
                </summary>
                <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-slate-800 sr-only">Lista de espera</h3>
                    <span className="text-xs text-gray-500">
                      {loadingWaitlist ? '...' : listaEspera.length ? `${listaEspera.length} pendiente(s)` : 'Sin pendientes'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      className="h-8 px-3 text-xs"
                      disabled={
                        promoteNextWaitlistMutation.isPending ||
                      efectivoVetCalendario == null ||
                        listaEspera.length === 0
                      }
                      onClick={() => promoteNextWaitlistMutation.mutate()}
                    >
                      Asignar siguiente
                    </Button>
                  </div>
                </div>
                {loadingWaitlist ? (
                  <p className="mt-2 text-sm text-gray-500">Cargando lista de espera...</p>
                ) : listaEspera.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">Nadie en espera para este slot.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {listaEspera.slice(0, 20).map((e) => (
                      <div
                        key={e.id}
                        className={`rounded-xl border p-3 shadow-sm transition ${
                          e.urgente ? 'border-red-200 bg-red-50/30' : 'border-slate-100 bg-white/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900 truncate">
                                {nombresMascotasDesdeCitasDia.get(e.mascota_id) ?? `Mascota #${e.mascota_id}`}
                              </div>
                              {e.urgente ? (
                                <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                                  URGENTE
                                </span>
                              ) : (
                                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  Normal
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600">
                              Slot: {slotLabelFromISO(e.fecha)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              En espera: {waitMinutesFrom(e.created_at)} min
                            </div>
                            {e.motivo ? (
                              <div className="text-xs text-slate-500 truncate">{e.motivo}</div>
                            ) : null}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                                e.procesada
                                  ? 'bg-emerald-100 text-emerald-800 ring-emerald-300'
                                  : 'bg-amber-100 text-amber-800 ring-amber-300'
                              }`}
                            >
                              {e.estado === 'llamado'
                                ? 'Llamado'
                                : e.estado === 'atendido'
                                  ? 'Atendido'
                                  : e.estado === 'cancelado'
                                    ? 'Cancelado'
                                    : e.procesada
                                      ? 'Procesada'
                                      : 'Pendiente'}
                            </span>
                            {!e.procesada ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  className="h-7 rounded-lg border border-sky-200 bg-sky-50 px-2 text-xs text-sky-700 hover:bg-sky-100"
                                  disabled={
                                    callWaitlistMutation.isPending ||
                                    promoteWaitlistMutation.isPending ||
                                    discardWaitlistMutation.isPending
                                  }
                                  onClick={() => callWaitlistMutation.mutate(e.id)}
                                >
                                  Llamar
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="h-7 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs text-emerald-800 hover:bg-emerald-100"
                                  disabled={
                                    callWaitlistMutation.isPending ||
                                    promoteWaitlistMutation.isPending ||
                                    discardWaitlistMutation.isPending
                                  }
                                  onClick={() => promoteWaitlistMutation.mutate(e.id)}
                                >
                                  Promover
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="h-7 rounded-lg border border-red-200 bg-red-50 px-2 text-xs text-red-700 hover:bg-red-100"
                                  disabled={
                                    callWaitlistMutation.isPending ||
                                    promoteWaitlistMutation.isPending ||
                                    discardWaitlistMutation.isPending
                                  }
                                  onClick={() => discardWaitlistMutation.mutate(e.id)}
                                >
                                  Descartar
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </details>
            </div>
          ) : (
            data && (
              <>
                <Table>
                <TableHead>
                    <TableRow>
                    <TableTh>Fecha</TableTh>
                    <TableTh>Mascota</TableTh>
                    <TableTh>Asignada a</TableTh>
                    <TableTh>Servicio</TableTh>
                    <TableTh>Estado</TableTh>
                    <TableTh className="text-right">Acción</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableTd className="text-sm whitespace-nowrap">
                        {formatDateTime(c.fecha)}
                      </TableTd>
                      <TableTd>
                        <Link
                          to={`/mascotas/${c.mascota_id}`}
                          state={{ from: '/citas' }}
                          className="text-primary-600 hover:underline"
                        >
                          {c.mascota_nombre ?? `Mascota #${c.mascota_id}`}
                        </Link>
                      </TableTd>
                      <TableTd className="text-sm text-gray-600">
                        {c.veterinario_nombre?.trim()
                          ? c.veterinario_nombre
                          : c.veterinario_id != null
                            ? `Vet #${c.veterinario_id}`
                            : '—'}
                      </TableTd>
                      <TableTd className="max-w-[200px] truncate">
                        {c.motivo ?? '—'}
                      </TableTd>
                      <TableTd>
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const st = estadoCitaBadgeMeta(c.estado)
                            return (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${st.className}`}
                              >
                                {st.label}
                              </span>
                            )
                          })()}
                          {c.urgente ? (
                            <span className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-800">
                              Urgente
                            </span>
                          ) : null}
                          {c.en_sala_espera ? (
                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                              En sala de espera
                            </span>
                          ) : null}
                        </div>
                      </TableTd>
                      <TableTd className="text-right">
                        <div className="flex justify-end gap-2">
                          {puedeReprogramar && c.estado === 'pendiente' ? (
                            <Button
                              variant="secondary"
                              disabled={checkInMutation.isPending}
                              onClick={() => checkInMutation.mutate(c.id)}
                            >
                              Check-in
                            </Button>
                          ) : null}
                          <Link to={`/citas/${c.id}`} state={{ from: '/citas' }}>
                            <Button variant="ghost">{isVet ? 'Ver' : 'Ver / Editar'}</Button>
                          </Link>
                        </div>
                      </TableTd>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={data.page}
                pageSize={data.page_size}
                total={data.total}
                onPageChange={setPage}
              />
              </>
            )
          )}
        </div>
      </Card>
    </div>
  )
}
