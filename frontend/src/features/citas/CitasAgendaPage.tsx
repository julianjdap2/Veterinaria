import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DatesSetArg } from '@fullcalendar/core'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
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
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { DataListPanel } from '../../shared/ui/DataListPanel'
import { Input } from '../../shared/ui/Input'
import { AGENDA_CITA_DIA_PAGE_SIZE } from '../../core/constants'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import type { AgendaFcView } from './CitasAgendaFullCalendar'
import { CitasAgendaSchedulerView } from './CitasAgendaSchedulerView'

const CitasAgendaFullCalendar = lazy(() =>
  import('./CitasAgendaFullCalendar').then((m) => ({ default: m.CitasAgendaFullCalendar })),
)
import { toLocalISO } from './agendaDateUtils'
import { CitaAgendaOpcionesModal } from './CitaAgendaOpcionesModal'
import type { Cita } from '../../api/types'

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'revision', label: 'En curso' },
  { value: 'atendida', label: 'Finalizada' },
  { value: 'cancelada', label: 'Cancelada' },
] as const

type AgendaViewMode = 'day' | 'week' | 'month' | 'list' | 'scheduler'

const VIEW_TABS: { id: AgendaViewMode; label: string }[] = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'list', label: 'Lista' },
  { id: 'scheduler', label: 'Programador' },
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const n = new Date(d)
  n.setDate(diff)
  n.setHours(0, 0, 0, 0)
  return n
}

function makeDefaultRange(anchor: string, mode: AgendaViewMode): { desde: string; hasta: string } {
  const d = new Date(`${anchor}T12:00:00`)
  if (Number.isNaN(d.getTime())) {
    const fb = new Date().toISOString().slice(0, 10)
    return makeDefaultRange(fb, mode)
  }
  if (mode === 'day' || mode === 'scheduler') {
    return { desde: `${anchor}T00:00:00`, hasta: `${anchor}T23:59:59` }
  }
  if (mode === 'week' || mode === 'list') {
    const s = startOfWeekMonday(d)
    const e = new Date(s)
    e.setDate(s.getDate() + 6)
    const y1 = s.getFullYear()
    const m1 = pad2(s.getMonth() + 1)
    const d1 = pad2(s.getDate())
    const y2 = e.getFullYear()
    const m2 = pad2(e.getMonth() + 1)
    const d2 = pad2(e.getDate())
    return { desde: `${y1}-${m1}-${d1}T00:00:00`, hasta: `${y2}-${m2}-${d2}T23:59:59` }
  }
  const y = d.getFullYear()
  const m = d.getMonth()
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const y1 = first.getFullYear()
  const m1 = pad2(first.getMonth() + 1)
  const d1 = pad2(first.getDate())
  const y2 = last.getFullYear()
  const m2 = pad2(last.getMonth() + 1)
  const d2 = pad2(last.getDate())
  return { desde: `${y1}-${m1}-${d1}T00:00:00`, hasta: `${y2}-${m2}-${d2}T23:59:59` }
}

function fromDatesSetRange(arg: DatesSetArg): { desde: string; hasta: string } {
  const desde = toLocalISO(arg.start)
  const endInclusive = new Date(arg.end.getTime() - 1)
  const hasta = toLocalISO(endInclusive)
  return { desde, hasta }
}

function waitMinutesFrom(createdAt: string | null): number {
  if (!createdAt) return 0
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 60000))
}

const FC_BY_MODE: Record<'day' | 'week' | 'month' | 'list', AgendaFcView> = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
  list: 'listWeek',
}

export function CitasAgendaPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState('')
  const [soloEnSalaEspera, setSoloEnSalaEspera] = useState(false)
  const prevEstadoBeforeSalaRef = useRef<string | null>(null)
  const [mostrarDisponibilidad, setMostrarDisponibilidad] = useState(false)
  const [agendaView, setAgendaView] = useState<AgendaViewMode>('day')

  const isVet = user?.rolId === ROLES.VETERINARIO
  const today = new Date().toISOString().slice(0, 10)
  const [fechaCalendarioDia, setFechaCalendarioDia] = useState(today)
  const [fechaDisponibilidad, setFechaDisponibilidad] = useState(today)
  const [vetDisponibilidadId, setVetDisponibilidadId] = useState<string>(() =>
    isVet ? String(user?.userId ?? '') : '',
  )

  const [queryRange, setQueryRange] = useState(() => makeDefaultRange(today, 'day'))
  const [citaOpciones, setCitaOpciones] = useState<Cita | null>(null)

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
      if (!estado || !['confirmada', 'revision'].includes(estado)) {
        setEstado('confirmada')
      }
      return
    }
    if (prevEstadoBeforeSalaRef.current !== null) {
      setEstado(prevEstadoBeforeSalaRef.current)
      prevEstadoBeforeSalaRef.current = null
    }
  }, [soloEnSalaEspera, estado])

  const setAgendaViewAndRange = useCallback((mode: AgendaViewMode) => {
    setAgendaView(mode)
    setQueryRange(makeDefaultRange(fechaCalendarioDia, mode))
  }, [fechaCalendarioDia])

  const puedeAsignarVet = user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION
  const { data: veterinarios = [] } = useVeterinarios({ enabled: puedeAsignarVet })

  const vetDisponibilidadNum = vetDisponibilidadId ? parseInt(vetDisponibilidadId, 10) : null
  const puedeReprogramar = user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION

  const vetParam: number | undefined = isVet
    ? user?.userId
    : vetDisponibilidadNum != null && !Number.isNaN(vetDisponibilidadNum)
      ? vetDisponibilidadNum
      : undefined

  const { data: citasQuery, isLoading: loadingCitas } = useQuery({
    queryKey: [
      'citas',
      'calendario',
      queryRange.desde,
      queryRange.hasta,
      vetParam,
      estado,
      soloEnSalaEspera,
    ],
    queryFn: () =>
      fetchCitasAgenda({
        page: 1,
        page_size: AGENDA_CITA_DIA_PAGE_SIZE,
        fecha_desde: queryRange.desde,
        fecha_hasta: queryRange.hasta,
        veterinario_id: vetParam,
        estado: estado || undefined,
        en_sala_espera: soloEnSalaEspera || undefined,
      }),
    enabled: (isVet || puedeReprogramar) && !!queryRange.desde,
  })

  const citasItems = citasQuery?.items ?? []

  const abrirOpcionesCitaPorId = useCallback(
    (id: number) => {
      const c = citasItems.find((x) => x.id === id)
      if (c) setCitaOpciones(c)
    },
    [citasItems],
  )

  const abrirOpcionesModalConCita = useCallback((c: Cita) => {
    setCitaOpciones(c)
  }, [])

  const { data: disponibilidad, isLoading: loadingDisp } = useQuery({
    queryKey: ['citas', 'disponibilidad', fechaDisponibilidad, vetDisponibilidadNum],
    queryFn: () => fetchCitasDisponibilidad(fechaDisponibilidad, vetDisponibilidadNum as number),
    enabled: mostrarDisponibilidad && !!fechaDisponibilidad && vetDisponibilidadNum != null,
  })

  const { data: disponibilidadDia, isLoading: loadingDispDia } = useQuery({
    queryKey: ['citas', 'disponibilidad', fechaCalendarioDia, vetDisponibilidadNum],
    queryFn: () => fetchCitasDisponibilidad(fechaCalendarioDia, vetDisponibilidadNum as number),
    enabled: vetDisponibilidadNum != null && (agendaView === 'day' || agendaView === 'scheduler'),
  })

  const { data: listaEspera = [], isLoading: loadingWaitlist } = useQuery({
    queryKey: ['citas', 'waitlist', fechaCalendarioDia, vetDisponibilidadNum],
    queryFn: () =>
      fetchListaEspera(fechaCalendarioDia, vetDisponibilidadNum as number, false, false),
    enabled:
      vetDisponibilidadNum != null &&
      puedeReprogramar &&
      (agendaView === 'day' || agendaView === 'scheduler'),
  })

  const nombresMascotasDesdeCitasDia = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of citasItems) {
      if (c.mascota_id != null && c.mascota_nombre) m.set(c.mascota_id, c.mascota_nombre)
    }
    return m
  }, [citasItems])

  const citasSchedulerDia = useMemo(() => {
    return citasItems.filter((c) => {
      if (!c.fecha) return false
      const d = new Date(c.fecha)
      const y = d.getFullYear()
      const m = pad2(d.getMonth() + 1)
      const day = pad2(d.getDate())
      return `${y}-${m}-${day}` === fechaCalendarioDia
    })
  }, [citasItems, fechaCalendarioDia])

  const onFcDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const r = fromDatesSetRange(arg)
      setQueryRange(r)
      if (agendaView === 'day') {
        setFechaCalendarioDia(r.desde.slice(0, 10))
      }
    },
    [agendaView],
  )

  const reprogramarMutation = useMutation({
    mutationFn: (payload: {
      citaId: number
      nuevaFechaISO: string
      nuevaFechaFinISO?: string
      veterinario_id?: number | null
    }) => {
      const body: Parameters<typeof updateCita>[1] = {
        fecha: payload.nuevaFechaISO,
        ...(payload.nuevaFechaFinISO ? { fecha_fin: payload.nuevaFechaFinISO } : {}),
        ...(payload.veterinario_id !== undefined ? { veterinario_id: payload.veterinario_id } : {}),
      }
      return updateCita(payload.citaId, body)
    },
    onSuccess: () => {
      toast.success('Cita reprogramada')
      queryClient.invalidateQueries({ queryKey: ['citas'] })
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
      queryClient.invalidateQueries({ queryKey: ['citas'] })
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
    mutationFn: () => promoteNextListaEspera(fechaCalendarioDia, vetDisponibilidadNum as number),
    onSuccess: () => {
      toast.success('Siguiente de la cola asignado')
      queryClient.invalidateQueries({ queryKey: ['citas'] })
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo asignar el siguiente'
      toast.error(msg)
    },
  })

  async function handleCalendarEventDrop(citaId: number, start: Date, end: Date) {
    await reprogramarMutation.mutateAsync({
      citaId,
      nuevaFechaISO: toLocalISO(start),
      nuevaFechaFinISO: toLocalISO(end),
    })
  }

  function irAHoy() {
    setFechaCalendarioDia(today)
    setQueryRange(makeDefaultRange(today, agendaView))
  }

  function shiftDay(delta: number) {
    const d = new Date(`${fechaCalendarioDia}T12:00:00`)
    d.setDate(d.getDate() + delta)
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    const day = pad2(d.getDate())
    const next = `${y}-${m}-${day}`
    setFechaCalendarioDia(next)
    setQueryRange(makeDefaultRange(next, agendaView))
  }

  const editableFc = puedeReprogramar && agendaView !== 'list'
  const showWaitlistPanel =
    puedeReprogramar && (agendaView === 'day' || agendaView === 'scheduler') && vetDisponibilidadNum != null

  return (
    <div className="w-full space-y-6 pb-10">
      <CitaAgendaOpcionesModal
        cita={citaOpciones}
        open={citaOpciones != null}
        onClose={() => setCitaOpciones(null)}
      />
      <PageHeader
        breadcrumbs={[{ label: 'Inicio', to: '/dashboard' }, { label: 'Citas' }]}
        title="Agenda de citas"
        subtitle={
          isVet
            ? 'Calendario unificado: cambia de vista y arrastra para reprogramar cuando esté permitido.'
            : 'Vistas día, semana, mes, lista y programador. Filtra por veterinario o ve todas las citas. Disponibilidad y sala de espera requieren veterinario seleccionado.'
        }
        actions={
          !isVet ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={mostrarDisponibilidad ? 'primary' : 'secondary'}
                onClick={() => setMostrarDisponibilidad((v) => !v)}
              >
                {mostrarDisponibilidad ? 'Ocultar disponibilidad' : 'Disponibilidad'}
              </Button>
              <Button
                variant={soloEnSalaEspera ? 'primary' : 'secondary'}
                onClick={() => setSoloEnSalaEspera((v) => !v)}
              >
                Solo sala de espera
              </Button>
              <Link to="/citas/nuevo">
                <Button>Nueva cita</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      <DataListPanel
        kicker="Agenda"
        title="Citas"
        clipOverflow={false}
        description="Filtra por estado. Sin veterinario seleccionado se muestran todas las citas del rango (admin/recepción). La disponibilidad y la lista de espera necesitan un veterinario."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            {!isVet && (
              <div className="min-w-[220px]">
                <label className="mb-1 block text-sm font-medium text-slate-700">Veterinario</label>
                <select
                  value={vetDisponibilidadId}
                  onChange={(e) => setVetDisponibilidadId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
                >
                  <option value="">Todos</option>
                  {veterinarios.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                {ESTADOS.map((e) => {
                  const active = estado === e.value
                  return (
                    <button
                      key={e.value || 'all'}
                      type="button"
                      onClick={() => setEstado(e.value)}
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
          </div>

          {!isVet && mostrarDisponibilidad && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-card backdrop-blur">
              <div className="flex flex-wrap items-end gap-4">
                <Input
                  type="date"
                  label="Fecha"
                  value={fechaDisponibilidad}
                  onChange={(e) => setFechaDisponibilidad(e.target.value)}
                  min={today}
                  className="max-w-[180px]"
                />
                <div className="min-w-[220px]">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Veterinario</label>
                  <select
                    value={vetDisponibilidadId}
                    onChange={(e) => setVetDisponibilidadId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60"
                  >
                    <option value="">Seleccionar veterinario</option>
                    {veterinarios.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                {loadingDisp ? (
                  <p className="text-sm text-slate-500">Cargando horarios...</p>
                ) : !disponibilidad ? (
                  <p className="text-sm text-slate-500">Selecciona fecha y veterinario.</p>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      Reservadas:{' '}
                      {disponibilidad.reservado.length ? disponibilidad.reservado.join(', ') : '—'}
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
                            className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-800 transition-colors hover:bg-primary-100"
                          >
                            {t}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No hay horarios disponibles.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-card backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {agendaView === 'scheduler' ? (
                  <>
                    <Button variant="secondary" type="button" onClick={() => shiftDay(-1)}>
                      Anterior
                    </Button>
                    <Button variant="secondary" type="button" onClick={irAHoy}>
                      Hoy
                    </Button>
                    <Button variant="secondary" type="button" onClick={() => shiftDay(1)}>
                      Siguiente
                    </Button>
                  </>
                ) : null}
                <Input
                  type="date"
                  label="Ir a fecha"
                  value={fechaCalendarioDia}
                  min={isVet ? today : undefined}
                  onChange={(e) => {
                    const v = e.target.value
                    setFechaCalendarioDia(v)
                    setQueryRange(makeDefaultRange(v, agendaView))
                  }}
                  className="max-w-[180px]"
                />
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
                {VIEW_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAgendaViewAndRange(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      agendaView === t.id
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingCitas ? (
              <p className="text-sm text-slate-500">Cargando citas...</p>
            ) : agendaView === 'scheduler' ? (
              <>
                {vetDisponibilidadNum != null && !loadingDispDia ? (
                  <p className="text-sm text-slate-600">
                    Reservados: {disponibilidadDia?.reservado?.length ?? 0} | Libres:{' '}
                    {disponibilidadDia?.disponible?.length ?? 0}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Selecciona un veterinario para ver huecos libres y la lista de espera.
                  </p>
                )}
                <CitasAgendaSchedulerView
                  diaISO={fechaCalendarioDia}
                  citas={citasSchedulerDia}
                  veterinarios={veterinarios}
                  editable={puedeReprogramar}
                  reprogramando={reprogramarMutation.isPending}
                  onCitaClick={(c) => setCitaOpciones(c)}
                  onReprogramar={(p) =>
                    reprogramarMutation.mutate({
                      citaId: p.citaId,
                      nuevaFechaISO: p.nuevaFechaISO,
                      veterinario_id: p.veterinario_id,
                    })
                  }
                />
              </>
            ) : (
              <Suspense
                fallback={
                  <div className="flex min-h-[min(78vh,900px)] items-center justify-center rounded-2xl border border-emerald-100/60 bg-white text-sm text-slate-600 shadow-card ring-1 ring-emerald-50/40">
                    Cargando calendario…
                  </div>
                }
              >
                <CitasAgendaFullCalendar
                  view={FC_BY_MODE[agendaView as keyof typeof FC_BY_MODE]}
                  citas={citasItems}
                  initialDate={fechaCalendarioDia}
                  calendarKey={`${agendaView}-${fechaCalendarioDia}`}
                  height="min(78vh, 900px)"
                  editable={editableFc}
                  onDatesSet={onFcDatesSet}
                  onEventClick={abrirOpcionesCitaPorId}
                  onAbrirOpcionesCita={abrirOpcionesModalConCita}
                  onEventDrop={handleCalendarEventDrop}
                />
              </Suspense>
            )}
          </div>

          {showWaitlistPanel && (
            <details className="rounded-xl border border-slate-200/70 bg-white/70 shadow-card backdrop-blur group open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-800">
                <span className="flex items-center gap-2">
                  Lista de espera
                  <span className="hidden text-xs font-normal text-slate-500 group-open:inline">
                    (expandir)
                  </span>
                </span>
                <span className="text-xs text-slate-400">▼</span>
              </summary>
              <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {loadingWaitlist
                      ? '...'
                      : listaEspera.length
                        ? `${listaEspera.length} pendiente(s)`
                        : 'Sin pendientes'}
                  </span>
                  <Button
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    disabled={
                      promoteNextWaitlistMutation.isPending ||
                      vetDisponibilidadNum == null ||
                      listaEspera.length === 0
                    }
                    onClick={() => promoteNextWaitlistMutation.mutate()}
                  >
                    Asignar siguiente
                  </Button>
                </div>
                {loadingWaitlist ? (
                  <p className="mt-2 text-sm text-slate-500">Cargando lista de espera...</p>
                ) : listaEspera.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Nadie en espera para este día y veterinario.</p>
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
                              <div className="truncate text-sm font-semibold text-slate-900">
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
                            <div className="text-xs text-slate-600">Prioridad de slot en agenda</div>
                            <div className="text-[11px] text-slate-500">
                              En espera: {waitMinutesFrom(e.created_at)} min
                            </div>
                            {e.motivo ? (
                              <div className="truncate text-xs text-slate-500">{e.motivo}</div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
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
          )}
        </div>
      </DataListPanel>
    </div>
  )
}
