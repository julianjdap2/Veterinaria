import { Link, useParams, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useCitaDetail } from './hooks/useCitasAgenda'
import { useVeterinarios } from '../usuarios/hooks/useUsuarios'
import { updateCita } from './api'
import { citasKeys } from './hooks/useCitasAgenda'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import { useConfigOperativa } from '../empresa/hooks/useConfigOperativa'
import { useVariablesClinicas } from '../empresa/hooks/useVariablesClinicas'
import {
  labelTipoServicio,
  duracionTipoServicio,
  citaEsHistorica,
} from './tipoServicio'

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

/** Convierte ISO string a datetime-local value (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(s: string | null): string {
  if (!s) return ''
  try {
    const d = new Date(s)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function normalizeTipoServicio(
  motivo: string | null | undefined,
  tipos: { id: string }[] | undefined,
): string {
  const v = (motivo ?? '').trim()
  if (tipos?.some((t) => t.id === v)) return v
  return tipos?.[0]?.id ?? 'consulta'
}

export function CitaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const numId = id ? parseInt(id, 10) : null
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const { data: cita, isLoading, isError } = useCitaDetail(numId)
  const { data: configOp } = useConfigOperativa()
  const { data: variablesClinicas } = useVariablesClinicas()
  const tipos = configOp?.tipos_servicio
  const puedeAsignarVet = user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION
  const { data: veterinarios = [] } = useVeterinarios({ enabled: puedeAsignarVet })

  const [fecha, setFecha] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [motivoPredefinido, setMotivoPredefinido] = useState<string>('consulta')
  const [notas, setNotas] = useState('')
  const [encargadosIds, setEncargadosIds] = useState<string[]>([])
  const [vacunaId, setVacunaId] = useState('')
  const [hospitalizacionId, setHospitalizacionId] = useState('')
  const [procedimientoId, setProcedimientoId] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [sinHoraDefinida, setSinHoraDefinida] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [changingState, setChangingState] = useState(false)
  const [assigningVet, setAssigningVet] = useState(false)
  const [edited, setEdited] = useState(false)

  const agendaScrollState = location.state as { agendaFocus?: string } | null
  useEffect(() => {
    if (agendaScrollState?.agendaFocus !== 'estado' || !cita?.id) return
    const t = window.setTimeout(() => {
      document.getElementById('cita-estado-asistencia')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [agendaScrollState?.agendaFocus, cita?.id])

  const isAdminOrRecep = puedeAsignarVet

  if (numId == null || isError || (!isLoading && !cita)) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-8">
        <PageHeader
          breadcrumbs={[{ label: 'Citas', to: '/citas' }, { label: 'Detalle' }]}
          title="Cita"
          subtitle="No se pudo cargar el turno."
          actions={
            <Link to="/citas" className="text-sm font-medium text-primary-600 hover:text-primary-800">
              ← Volver a agenda
            </Link>
          }
        />
        <p className="text-red-600">Cita no encontrada.</p>
      </div>
    )
  }

  if (isLoading || !cita) {
    return <p className="text-gray-500">Cargando...</p>
  }

  async function handleSave() {
    if (numId == null) return
    setError(null)
    setSaving(true)
    try {
      const motivoFinal = motivoPredefinido || null
      await updateCita(numId, {
        fecha: fecha ? `${fecha}:00` : null,
        fecha_fin: fechaFin ? `${fechaFin}:00` : null,
        motivo: motivoFinal || null,
        notas: notas.trim() || null,
        urgente,
        sin_hora_definida: sinHoraDefinida,
        encargados_ids: encargadosIds.map((x) => parseInt(x, 10)).filter((x) => Number.isFinite(x) && x > 0),
        extras_clinicos: {
          vacuna_id: vacunaId || undefined,
          hospitalizacion_id: hospitalizacionId || undefined,
          procedimiento_id: procedimientoId || undefined,
        },
      })
      queryClient.invalidateQueries({ queryKey: citasKeys().detail(numId) })
      queryClient.invalidateQueries({ queryKey: citasKeys().agenda({ page: 1, page_size: 20 }) })
      setEdited(false)
      toast.success('Cambios guardados correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al guardar.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleAsignarVeterinario(veterinarioId: number | null) {
    if (numId == null) return
    setError(null)
    setAssigningVet(true)
    try {
      await updateCita(numId, { veterinario_id: veterinarioId })
      queryClient.invalidateQueries({ queryKey: citasKeys().detail(numId) })
      queryClient.invalidateQueries({ queryKey: citasKeys().agenda({ page: 1, page_size: 20 }) })
      toast.success(veterinarioId ? 'Veterinario asignado' : 'Asignación quitada')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al asignar.'
      setError(msg)
      toast.error(msg)
    } finally {
      setAssigningVet(false)
    }
  }

  async function handleCambiarEstado(nuevoEstado: 'confirmada' | 'atendida' | 'cancelada') {
    if (numId == null) return
    setError(null)
    setChangingState(true)
    try {
      await updateCita(numId, { estado: nuevoEstado })
      queryClient.invalidateQueries({ queryKey: citasKeys().detail(numId) })
      queryClient.invalidateQueries({ queryKey: citasKeys().agenda({ page: 1, page_size: 20 }) })
      const labels = { confirmada: 'Confirmada', atendida: 'Atendida', cancelada: 'Cancelada' }
      toast.success(`Estado actualizado a "${labels[nuevoEstado]}"`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al cambiar estado.'
      setError(msg)
      toast.error(msg)
    } finally {
      setChangingState(false)
    }
  }

  const showForm = edited
  const estadoActual = cita?.estado ?? 'pendiente'
  const showStateButtons = !showForm && !changingState
  const displayFecha = edited ? fecha : toDatetimeLocal(cita.fecha)
  const labelEstado = (estado: string | null | undefined) => {
    const e = (estado ?? '').trim()
    if (!e) return 'Pendiente'
    if (e === 'pendiente') return 'Pendiente'
    if (e === 'confirmada') return 'Confirmada'
    if (e === 'revision') return 'En curso'
    if (e === 'atendida') return 'Finalizada'
    if (e === 'cancelada') return 'Cancelada'
    return e
  }
  const puedeEditarCita = user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION
  const historica = cita ? citaEsHistorica(cita) : false
  const st = location.state as { from?: string; mascotaId?: number; agendaFocus?: string } | null
  const backHref =
    st?.from === '/mascotas' && st?.mascotaId != null ? `/mascotas/${st.mascotaId}` : '/citas'
  const backLabel = st?.from === '/mascotas' ? '← Volver a ficha mascota' : '← Volver a agenda'

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Citas', to: '/citas' }, { label: `Cita #${cita.id}` }]}
        title={`Cita #${cita.id}`}
        subtitle={cita.fecha ? formatDateTime(cita.fecha) : undefined}
        actions={
          <Link to={backHref} className="text-sm font-medium text-primary-600 hover:text-primary-800">
            {backLabel}
          </Link>
        }
      />
      {historica && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          Cita en solo lectura (fecha pasada o estado final). No se pueden modificar datos.
        </p>
      )}
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <div id="cita-estado-asistencia">
      <Card
        title="Detalle del turno"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {showStateButtons && estadoActual === 'pendiente' && puedeAsignarVet && !historica && (
              <>
                <Button onClick={() => handleCambiarEstado('confirmada')} loading={changingState}>
                  Confirmar cita
                </Button>
                <Button variant="ghost" onClick={() => handleCambiarEstado('cancelada')} loading={changingState}>
                  Cancelar cita
                </Button>
              </>
            )}
            {showStateButtons && estadoActual === 'confirmada' && puedeAsignarVet && !historica && (
              <>
                <p className="text-sm text-amber-700 font-medium px-2">
                  En espera de consulta del veterinario
                </p>
                <Button variant="ghost" onClick={() => handleCambiarEstado('cancelada')} loading={changingState}>
                  Cancelar cita
                </Button>
              </>
            )}
            {puedeEditarCita && showForm ? (
              <>
                <Button onClick={handleSave} loading={saving}>
                  Guardar cambios
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFecha(toDatetimeLocal(cita.fecha))
                    setFechaFin(toDatetimeLocal(cita.fecha_fin ?? null))
                    setMotivoPredefinido(normalizeTipoServicio(cita.motivo, tipos))
                    setNotas(cita.notas ?? '')
                    setUrgente(!!cita.urgente)
                    setSinHoraDefinida(!!cita.sin_hora_definida)
                    setEncargadosIds((cita.encargados_ids ?? []).map(String))
                    setVacunaId(cita.extras_clinicos?.vacuna_id ?? '')
                    setHospitalizacionId(cita.extras_clinicos?.hospitalizacion_id ?? '')
                    setProcedimientoId(cita.extras_clinicos?.procedimiento_id ?? '')
                    setEdited(false)
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </>
            ) : puedeEditarCita && !historica ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setFecha(toDatetimeLocal(cita.fecha))
                  setFechaFin(toDatetimeLocal(cita.fecha_fin ?? null))
                  setMotivoPredefinido(normalizeTipoServicio(cita.motivo, tipos))
                  setNotas(cita.notas ?? '')
                  setUrgente(!!cita.urgente)
                  setSinHoraDefinida(!!cita.sin_hora_definida)
                  setEncargadosIds((cita.encargados_ids ?? []).map(String))
                  setVacunaId(cita.extras_clinicos?.vacuna_id ?? '')
                  setHospitalizacionId(cita.extras_clinicos?.hospitalizacion_id ?? '')
                  setProcedimientoId(cita.extras_clinicos?.procedimiento_id ?? '')
                  setEdited(true)
                }}
              >
                Editar
              </Button>
            ) : null}
          </div>
        }
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Mascota</dt>
            <dd className="mt-0.5">
              {cita.mascota_id != null ? (
                <Link
                  to={`/mascotas/${cita.mascota_id}`}
                  state={{ from: '/citas' }}
                  className="text-primary-600 hover:underline"
                >
                  {cita.mascota_nombre ?? `Mascota #${cita.mascota_id}`}
                </Link>
              ) : (
                <span className="text-slate-500">Reserva de espacio</span>
              )}
            </dd>
          </div>
        </dl>
        {showForm ? (
          <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
            <Input
              type="datetime-local"
              label="Fecha y hora"
              value={displayFecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={saving || sinHoraDefinida}
            />
            <Input
              type="datetime-local"
              label="Fecha/hora de finalización"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              disabled={saving || sinHoraDefinida}
            />
            <div className="flex items-center gap-2">
              <input
                id="cita-sin-hora-definida-detail"
                type="checkbox"
                checked={sinHoraDefinida}
                onChange={(e) => setSinHoraDefinida(e.target.checked)}
                disabled={saving}
                className="rounded border-primary-200 text-primary-600 focus:ring-primary-500/60"
              />
              <label htmlFor="cita-sin-hora-definida-detail" className="text-sm font-medium text-slate-700">
                Sin hora definida
              </label>
            </div>
            {isAdminOrRecep && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Encargados (múltiple)</label>
                <select
                  multiple
                  value={encargadosIds}
                  onChange={(e) =>
                    setEncargadosIds(
                      Array.from(e.target.selectedOptions)
                        .map((o) => o.value)
                        .filter(Boolean),
                    )
                  }
                  disabled={saving}
                  className="h-28 w-full max-w-md rounded-xl border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {veterinarios.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de servicio</label>
              <select
                value={motivoPredefinido}
                onChange={(e) => setMotivoPredefinido(e.target.value)}
                disabled={saving}
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {(tipos ?? [{ id: 'consulta', label: 'Consulta' }]).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Tiempo estimado: {duracionTipoServicio(motivoPredefinido, tipos)}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Notas para la cita (síntomas, observaciones de recepción, etc.)"
                disabled={saving}
                className="w-full max-w-md rounded-xl border border-gray-300 px-3 py-2 text-gray-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vacuna</label>
                <select
                  value={vacunaId}
                  onChange={(e) => setVacunaId(e.target.value)}
                  disabled={saving}
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No aplica</option>
                  {(variablesClinicas?.vacunas ?? []).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Hospitalización</label>
                <select
                  value={hospitalizacionId}
                  onChange={(e) => setHospitalizacionId(e.target.value)}
                  disabled={saving}
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No aplica</option>
                  {(variablesClinicas?.hospitalizacion ?? []).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Procedimiento</label>
                <select
                  value={procedimientoId}
                  onChange={(e) => setProcedimientoId(e.target.value)}
                  disabled={saving}
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No aplica</option>
                  {(variablesClinicas?.procedimientos ?? []).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="cita-urgente"
                type="checkbox"
                checked={urgente}
                onChange={(e) => setUrgente(e.target.checked)}
                disabled={saving}
                className="rounded border-primary-200 text-primary-600 focus:ring-primary-500/60"
              />
              <label htmlFor="cita-urgente" className="text-sm font-medium text-slate-700">
                Marcar como urgente
              </label>
            </div>
          </div>
        ) : (
          <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Asignada a</dt>
              <dd className="mt-0.5">
                {isAdminOrRecep ? (
                  <select
                    value={cita.veterinario_id ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      handleAsignarVeterinario(v === '' ? null : parseInt(v, 10))
                    }}
                    disabled={assigningVet || historica}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
                  >
                    <option value="">Sin asignar</option>
                    {veterinarios.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-gray-900">
                    {cita.veterinario_id != null
                      ? (veterinarios.find((v) => v.id === cita.veterinario_id)?.nombre ?? `Veterinario #${cita.veterinario_id}`)
                      : 'Sin asignar'}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Fecha</dt>
              <dd className="mt-0.5 text-gray-900">{formatDateTime(cita.fecha)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Finaliza</dt>
              <dd className="mt-0.5 text-gray-900">
                {cita.sin_hora_definida ? 'Sin hora definida' : formatDateTime(cita.fecha_fin ?? null)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Encargados</dt>
              <dd className="mt-0.5 text-gray-900">
                {cita.encargados_ids?.length
                  ? cita.encargados_ids
                      .map((idVet) => veterinarios.find((v) => v.id === idVet)?.nombre ?? `Veterinario #${idVet}`)
                      .join(', ')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Servicio</dt>
              <dd className="mt-0.5 text-gray-900">{labelTipoServicio(cita.motivo, tipos)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tiempo estimado</dt>
              <dd className="mt-0.5 text-gray-900">{duracionTipoServicio(cita.motivo, tipos)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Notas</dt>
              <dd className="mt-0.5 text-gray-900">{cita.notas ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Vacuna</dt>
              <dd className="mt-0.5 text-gray-900">
                {variablesClinicas?.vacunas.find((x) => x.id === cita.extras_clinicos?.vacuna_id)?.nombre ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Hospitalización</dt>
              <dd className="mt-0.5 text-gray-900">
                {variablesClinicas?.hospitalizacion.find((x) => x.id === cita.extras_clinicos?.hospitalizacion_id)?.nombre ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Procedimiento</dt>
              <dd className="mt-0.5 text-gray-900">
                {variablesClinicas?.procedimientos.find((x) => x.id === cita.extras_clinicos?.procedimiento_id)?.nombre ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Urgente</dt>
              <dd className="mt-0.5">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${
                    cita.urgente
                      ? 'border-red-300 bg-red-50 text-red-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {cita.urgente ? 'Sí' : 'No'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Estado</dt>
              <dd className="mt-0.5">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    cita.estado === 'atendida'
                      ? 'bg-emerald-200 text-emerald-900 ring-1 ring-emerald-300'
                        : cita.estado === 'revision'
                          ? 'bg-primary-200 text-primary-900 ring-1 ring-primary-300'
                      : cita.estado === 'cancelada'
                            ? 'bg-red-200 text-red-900 ring-1 ring-red-300'
                        : cita.estado === 'confirmada'
                              ? 'bg-sky-200 text-sky-900 ring-1 ring-sky-300'
                              : 'bg-slate-200 text-slate-900 ring-1 ring-slate-300'
                  }`}
                >
                  {labelEstado(cita.estado)}
                </span>
              </dd>
            </div>
          </dl>
        )}
      </Card>
      </div>
      {(user?.rolId === ROLES.VETERINARIO || user?.rolId === ROLES.ADMIN) && cita?.estado === 'confirmada' && cita.mascota_id != null && (
        <div className="flex flex-wrap gap-2">
          <Link
            to="/consultas/nuevo"
            state={{
              mascotaId: cita.mascota_id,
              motivoConsulta: cita.motivo ?? '',
              citaId: cita.id,
            }}
            className="inline-flex items-center rounded-xl border border-primary-500 bg-white px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Crear consulta desde esta cita
          </Link>
        </div>
      )}
    </div>
  )
}
