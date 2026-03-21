import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useClientes } from '../clientes/hooks/useClientes'
import { useMascotas } from '../mascotas/hooks/useMascotas'
import { useVeterinarios } from '../usuarios/hooks/useUsuarios'
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue'
import {
  createCita,
  createCitaLlegada,
  createCitasRecurrentes,
  fetchCitasDisponibilidad,
} from './api'
import { citasKeys } from './hooks/useCitasAgenda'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import { useConfigOperativa } from '../empresa/hooks/useConfigOperativa'
import { duracionTipoServicio, flagsTipoServicio } from './tipoServicio'

const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH_LENGTH = 2

/** Si el texto son solo dígitos, buscar por documento; si no, por nombre. */
function clientSearchFilters(term: string) {
  if (term.length < MIN_SEARCH_LENGTH) return {}
  const onlyDigits = /^\d+$/.test(term)
  return onlyDigits
    ? { page: 1, page_size: 15, documento: term }
    : { page: 1, page_size: 15, nombre: term }
}

export function CitaCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [clienteSearch, setClienteSearch] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<{ id: number; nombre: string } | null>(null)
  const [showClientResults, setShowClientResults] = useState(false)
  const [mascotaId, setMascotaId] = useState('')
  const state = location.state as { fecha?: string; veterinarioId?: number } | null
  const preFecha = state?.fecha ? String(state.fecha) : ''
  const preFechaDia = preFecha ? preFecha.split('T')[0] : ''
  const preHora = preFecha ? preFecha.split('T')[1]?.slice(0, 5) ?? '' : ''

  const todayIso = new Date().toISOString().slice(0, 10)
  const [fechaDia, setFechaDia] = useState(preFechaDia || todayIso)
  const [hora, setHora] = useState(preHora)
  const [tipoServicio, setTipoServicio] = useState<string>('consulta')
  const [veterinarioId, setVeterinarioId] = useState('')
  const [notas, setNotas] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [recurrente, setRecurrente] = useState(false)
  const [repeticiones, setRepeticiones] = useState(2)
  const [intervaloSemana, setIntervaloSemana] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const clientSearchRef = useRef<HTMLDivElement>(null)

  const user = useAuthStore((s) => s.user)
  const isVet = user?.rolId === ROLES.VETERINARIO
  const { data: configOp } = useConfigOperativa({ enabled: !isVet })
  const tipos = configOp?.tipos_servicio

  useEffect(() => {
    if (!tipos?.length) return
    if (!tipos.some((t) => t.id === tipoServicio)) {
      setTipoServicio(tipos[0].id)
    }
  }, [tipos, tipoServicio])

  const { allowUrgente, allowRecurrente } = flagsTipoServicio(tipoServicio, tipos)

  useEffect(() => {
    if (!allowUrgente) setUrgente(false)
    if (!allowRecurrente) setRecurrente(false)
  }, [allowUrgente, allowRecurrente])

  if (isVet) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva cita</h1>
        <Card title="Acceso restringido">
          <p className="text-sm text-gray-700">
            Como veterinario no puedes crear citas. Pide a recepción/administración que registre el turno.
          </p>
          <div className="mt-4">
            <Button onClick={() => navigate('/citas')} variant="secondary">
              Volver a agenda
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    if (state?.veterinarioId == null) return
    // Solo inicializamos veterinario si el usuario tiene control sobre ese campo.
    if (user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION) {
      setVeterinarioId(String(state.veterinarioId))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const puedeAsignarVet = user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION
  const { data: veterinarios = [] } = useVeterinarios({ enabled: puedeAsignarVet })

  const debouncedSearch = useDebouncedValue(clienteSearch.trim(), SEARCH_DEBOUNCE_MS)
  const clientFilters = clientSearchFilters(debouncedSearch)
  const hasSearchTerm = debouncedSearch.length >= MIN_SEARCH_LENGTH
  const { data: clientesData, isLoading: searchingClientes } = useClientes(clientFilters, {
    enabled: hasSearchTerm,
  })
  const { data: mascotasData } = useMascotas(
    {
      page: 1,
      page_size: 50,
      cliente_id: selectedCliente?.id,
      incluir_inactivos: false,
    },
    { enabled: !!selectedCliente }
  )

  const clientes = clientesData?.items ?? []
  const mascotas = mascotasData?.items ?? []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const effectiveVeterinarioId =
    user?.rolId === ROLES.VETERINARIO
      ? user.userId
      : veterinarioId
        ? parseInt(veterinarioId, 10)
        : undefined

  const {
    data: disponibilidad,
    isLoading: loadingDisponibilidad,
  } = useQuery({
    queryKey: ['citas', 'disponibilidad', fechaDia, effectiveVeterinarioId],
    queryFn: () =>
      fetchCitasDisponibilidad(
        fechaDia,
        effectiveVeterinarioId as number,
      ),
    enabled: !!fechaDia && effectiveVeterinarioId != null && (user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION || user?.rolId === ROLES.VETERINARIO),
  })

  const slotsJornada = useMemo(() => {
    const out: string[] = []
    const SLOT_MINUTES = 30
    const JORNADA_INICIO_MIN = 8 * 60
    const JORNADA_FIN_MIN = 18 * 60 + 30
    for (let m = JORNADA_INICIO_MIN; m <= JORNADA_FIN_MIN; m += SLOT_MINUTES) {
      const hh = Math.floor(m / 60)
      const mm = m % 60
      out.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
    }
    return out
  }, [])

  useEffect(() => {
    const disponibles = disponibilidad?.disponible ?? []
    const reservados = disponibilidad?.reservado ?? []

    if (!hora || !slotsJornada.includes(hora)) {
      setHora(disponibles[0] ?? reservados[0] ?? '')
      return
    }

    // Mantener la selección si sigue dentro de la jornada.
  }, [disponibilidad, hora, slotsJornada])

  const slotDisponible = disponibilidad?.disponible?.includes(hora) ?? false

  const mutation = useMutation({
    mutationFn: createCita,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: citasKeys().agenda({ page: 1, page_size: 20 }) })
      // Importante: también invalida el listado de disponibilidad para que
      // al regresar a la Agenda el slot ya no aparezca como disponible.
      queryClient.invalidateQueries({ queryKey: ['citas', 'disponibilidad'] })
      toast.success('Cita creada correctamente')
      navigate(`/citas/${data.id}`)
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al crear cita.'
      setError(msg)
      toast.error(msg)
    },
  })

  const mutationRecurrente = useMutation({
    mutationFn: createCitasRecurrentes,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: citasKeys().agenda({ page: 1, page_size: 20 }) })
      queryClient.invalidateQueries({ queryKey: ['citas', 'disponibilidad'] })
      toast.success(
        `Citas recurrentes creadas: ${data.created_ids.length}. Fallidas: ${data.skipped.length}. En espera: ${data.waitlist_ids.length}.`,
      )
      if (data.created_ids.length) {
        navigate(`/citas/${data.created_ids[0]}`)
      } else {
        navigate('/citas')
      }
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al crear citas recurrentes.'
      setError(msg)
      toast.error(msg)
    },
  })

  const mutationLlegada = useMutation({
    mutationFn: createCitaLlegada,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: citasKeys().agenda({ page: 1, page_size: 20 }) })
      queryClient.invalidateQueries({ queryKey: ['citas', 'disponibilidad'] })
      queryClient.invalidateQueries({ queryKey: ['citas', 'waitlist'] })
      toast.success('Cita por orden de llegada asignada automáticamente')
      navigate(`/citas/${data.id}`)
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al asignar por orden de llegada.'
      setError(msg)
      toast.error(msg)
    },
  })

  function handleSelectCliente(id: number, nombre: string) {
    setSelectedCliente({ id, nombre })
    setClienteSearch('')
    setShowClientResults(false)
    setMascotaId('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const mId = parseInt(mascotaId, 10)
    if (!mascotaId || Number.isNaN(mId)) {
      setError('Selecciona una mascota.')
      toast.warning('Selecciona una mascota.')
      return
    }
    const motivoFinal = tipoServicio || undefined
    if (!fechaDia || !hora) {
      setError('Selecciona fecha y hora.')
      toast.warning('Selecciona fecha y hora.')
      return
    }

    const fechaInicio = `${fechaDia}T${hora}:00`
    if (recurrente && repeticiones > 1) {
      if (effectiveVeterinarioId == null) {
        setError('Selecciona un veterinario.')
        toast.warning('Selecciona un veterinario.')
        return
      }
      if (!slotDisponible) {
        setError('Para recurrentes debes usar un horario disponible.')
        toast.warning('Para recurrentes debes usar un horario disponible.')
        return
      }
      mutationRecurrente.mutate({
        mascota_id: mId,
        fecha_inicio: fechaInicio,
        veterinario_id: effectiveVeterinarioId as number,
        motivo: motivoFinal,
        notas: notas.trim() || undefined,
        urgente,
        repeticiones,
        intervalo_semana: intervaloSemana,
        crear_waitlist_en_conflicto: true,
      })
    } else {
      if (!slotDisponible) {
        mutationLlegada.mutate({
          mascota_id: mId,
          motivo: motivoFinal,
          notas: notas.trim() || undefined,
          urgente,
          veterinario_preferido_id: effectiveVeterinarioId ?? null,
        })
        return
      }

      mutation.mutate({
        mascota_id: mId,
        fecha: fechaInicio,
        motivo: motivoFinal,
        // El estado inicial SIEMPRE es 'pendiente' (controlado por backend/state machine).
        estado: 'pendiente',
        veterinario_id: effectiveVeterinarioId,
        notas: notas.trim() || undefined,
        urgente,
      })
    }
  }

  function handleAtencionLlegada() {
    setError(null)
    const mId = parseInt(mascotaId, 10)
    if (!mascotaId || Number.isNaN(mId)) {
      setError('Selecciona una mascota.')
      toast.warning('Selecciona una mascota.')
      return
    }
    const motivoFinal = tipoServicio || undefined
    mutationLlegada.mutate({
      mascota_id: mId,
      motivo: motivoFinal,
      notas: notas.trim() || undefined,
      urgente,
      veterinario_preferido_id: effectiveVeterinarioId ?? null,
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nueva cita</h1>
      <Card title="Datos de la cita">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Paso 1: Cliente */}
          <div ref={clientSearchRef}>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cliente <span className="text-red-500">*</span>
            </label>
            {selectedCliente ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <span className="font-medium text-slate-900">{selectedCliente.nombre}</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm text-primary-600"
                  onClick={() => {
                    setSelectedCliente(null)
                    setMascotaId('')
                  }}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <>
                <Input
                  type="text"
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value)
                    setShowClientResults(true)
                  }}
                  onFocus={() => debouncedSearch.length >= MIN_SEARCH_LENGTH && setShowClientResults(true)}
                  placeholder="Buscar por nombre o documento (mín. 2 caracteres)"
                  disabled={mutation.isPending}
                  autoComplete="off"
                />
                {showClientResults && hasSearchTerm && (
                  <div className="relative z-10 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-card-hover">
                    {searchingClientes && (
                      <p className="px-3.5 py-2 text-sm text-slate-500">Buscando...</p>
                    )}
                    {!searchingClientes && clientes.length === 0 && (
                      <p className="px-3.5 py-2 text-sm text-slate-500">
                        No se encontraron clientes. Prueba con otro nombre.
                      </p>
                    )}
                    {!searchingClientes &&
                      clientes.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="block w-full px-3.5 py-2 text-left text-sm text-slate-900 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none rounded-lg"
                          onClick={() => handleSelectCliente(c.id, c.nombre)}
                        >
                          {c.nombre}
                          {c.documento ? (
                            <span className="ml-2 text-slate-500">({c.documento})</span>
                          ) : null}
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Paso 2: Mascota (solo si hay cliente) */}
          {selectedCliente && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mascota <span className="text-red-500">*</span>
              </label>
              {mascotas.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Este cliente no tiene mascotas registradas.{' '}
                  <Link
                    to="/mascotas/nuevo"
                    className="font-medium text-primary-600 hover:underline"
                  >
                    Registrar mascota
                  </Link>
                </p>
              ) : (
                <select
                  value={mascotaId}
                  onChange={(e) => setMascotaId(e.target.value)}
                  required
                  disabled={mutation.isPending}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
                >
                  <option value="">Seleccionar mascota</option>
                  {mascotas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {puedeAsignarVet && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Asignar veterinario</label>
              <select
                value={veterinarioId}
                onChange={(e) => setVeterinarioId(e.target.value)}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value="">Sin asignar</option>
                {veterinarios.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="date"
              label="Fecha"
              value={fechaDia}
              onChange={(e) => setFechaDia(e.target.value)}
              disabled={mutation.isPending}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Hora</label>
              <select
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                disabled={
                  mutation.isPending ||
                  mutationRecurrente.isPending ||
                  loadingDisponibilidad ||
                  effectiveVeterinarioId == null
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                {loadingDisponibilidad ? (
                  <option value="">Cargando...</option>
                ) : (
                  slotsJornada.map((t) => {
                    const isDisponible = disponibilidad?.disponible?.includes(t) ?? false
                    return (
                      <option key={t} value={t}>
                        {t}
                        {!isDisponible ? ' (ocupado)' : ''}
                      </option>
                    )
                  })
                )}
              </select>

              {disponibilidad?.reservado?.length ? (
                <p className="mt-1 text-xs text-gray-500">
                  Reservadas: {disponibilidad.reservado.join(', ')}
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de servicio</label>
            <select
              value={tipoServicio}
              onChange={(e) => setTipoServicio(e.target.value)}
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            >
              {(tipos ?? [{ id: 'consulta', label: 'Consulta' }]).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Tiempo estimado: {duracionTipoServicio(tipoServicio, tipos)}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Notas para la cita (ej. síntomas, observaciones de recepción)"
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label
              htmlFor="cita-urgente"
              className={`group flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                !allowUrgente ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              } ${
                urgente
                  ? 'border-red-300 bg-red-50/80 ring-1 ring-red-200'
                  : 'border-slate-200 bg-white/70 hover:border-slate-300'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">Urgente</p>
                <p className="text-xs text-slate-500">Prioriza esta cita en agenda.</p>
              </div>
              <span
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  urgente ? 'bg-red-500' : 'bg-slate-300'
                }`}
              >
                <input
                  id="cita-urgente"
                  type="checkbox"
                  checked={urgente}
                  onChange={(e) => setUrgente(e.target.checked)}
                  disabled={
                    !allowUrgente ||
                    mutation.isPending ||
                    mutationRecurrente.isPending ||
                    mutationLlegada.isPending
                  }
                  className="sr-only"
                />
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    urgente ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </span>
            </label>

            <label
              htmlFor="cita-recurrente"
              className={`group flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                !allowRecurrente ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              } ${
                recurrente
                  ? 'border-primary-300 bg-primary-50/80 ring-1 ring-primary-200'
                  : 'border-slate-200 bg-white/70 hover:border-slate-300'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">Recurrente</p>
                <p className="text-xs text-slate-500">Repite la cita en semanas.</p>
              </div>
              <span
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  recurrente ? 'bg-primary-500' : 'bg-slate-300'
                }`}
              >
                <input
                  id="cita-recurrente"
                  type="checkbox"
                  checked={recurrente}
                  onChange={(e) => setRecurrente(e.target.checked)}
                  disabled={
                    !allowRecurrente ||
                    mutation.isPending ||
                    mutationRecurrente.isPending ||
                    mutationLlegada.isPending
                  }
                  className="sr-only"
                />
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    recurrente ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </span>
            </label>
          </div>

          {recurrente && (
            <div className="rounded-2xl border border-primary-200/70 bg-primary-50/40 p-4 ring-1 ring-primary-100/80">
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-800">Configuración de recurrencia</p>
                <p className="text-xs text-slate-500">Define cuántas citas crear y cada cuántas semanas.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Repeticiones</label>
                  <input
                    type="number"
                    value={repeticiones}
                    min={2}
                    max={50}
                    onChange={(e) => setRepeticiones(parseInt(e.target.value || '2', 10))}
                    disabled={mutation.isPending || mutationRecurrente.isPending || mutationLlegada.isPending}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
                  />
                  <p className="mt-1 text-xs text-slate-500">Mín. 2, máx. 50.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Cada (semanas)</label>
                  <input
                    type="number"
                    value={intervaloSemana}
                    min={1}
                    max={12}
                    onChange={(e) => setIntervaloSemana(parseInt(e.target.value || '1', 10))}
                    disabled={mutation.isPending || mutationRecurrente.isPending || mutationLlegada.isPending}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
                  />
                  <p className="mt-1 text-xs text-slate-500">Mín. 1, máx. 12.</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
                loading={mutation.isPending || mutationRecurrente.isPending || mutationLlegada.isPending}
              disabled={!selectedCliente || mascotas.length === 0}
            >
              {recurrente && repeticiones > 1
                ? 'Crear citas recurrentes'
                : slotDisponible
                  ? 'Crear cita'
                    : 'Asignar por llegada'}
            </Button>
            <Button
                type="button"
                variant="secondary"
                onClick={handleAtencionLlegada}
                loading={mutationLlegada.isPending}
                disabled={!selectedCliente || mascotas.length === 0 || mutation.isPending || mutationRecurrente.isPending || mutationLlegada.isPending}
              >
                Atención por orden de llegada
              </Button>
              <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/citas')}
                disabled={mutation.isPending || mutationRecurrente.isPending || mutationLlegada.isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
