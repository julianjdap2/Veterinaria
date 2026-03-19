import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useCitaDetail } from './hooks/useCitasAgenda'
import { useMascotas } from '../mascotas/hooks/useMascotas'
import { useVeterinarios } from '../usuarios/hooks/useUsuarios'
import { useMotivosConsulta } from '../catalogo/hooks/useMotivosConsulta'
import { updateCita } from './api'
import { citasKeys } from './hooks/useCitasAgenda'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'revision', label: 'Revisión' },
  { value: 'atendida', label: 'Atendida' },
  { value: 'cancelada', label: 'Cancelada' },
] as const

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

export function CitaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const numId = id ? parseInt(id, 10) : null
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const { data: cita, isLoading, isError } = useCitaDetail(numId)
  const { data: mascotasData } = useMascotas({ page: 1, page_size: 500 })
  const puedeAsignarVet = user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION
  const { data: veterinarios = [] } = useVeterinarios({ enabled: puedeAsignarVet })
  const { data: motivosList = [] } = useMotivosConsulta()
  const mascotasMap = new Map((mascotasData?.items ?? []).map((m) => [m.id, m.nombre]))

  const [fecha, setFecha] = useState('')
  const [motivoPredefinido, setMotivoPredefinido] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [estado, setEstado] = useState('pendiente')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [changingState, setChangingState] = useState(false)
  const [assigningVet, setAssigningVet] = useState(false)
  const [edited, setEdited] = useState(false)

  const isVet = user?.rolId === ROLES.VETERINARIO
  const canAssignMe = isVet && user?.userId != null && cita?.veterinario_id !== user.userId
  const isAdminOrRecep = puedeAsignarVet

  if (numId == null || isError || (!isLoading && !cita)) {
    return (
      <div className="space-y-4">
        <Link to="/citas" className="text-primary-600 hover:underline text-sm">
          ← Volver a agenda
        </Link>
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
      const motivoFinal =
        motivoPredefinido === 'otro' ? motivoOtro.trim() : (motivoPredefinido || null)
      await updateCita(numId, {
        fecha: fecha ? `${fecha}:00` : null,
        motivo: motivoFinal || null,
        estado: estado as 'pendiente' | 'confirmada' | 'atendida' | 'cancelada',
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

  async function handleAsignarme() {
    if (numId == null || user?.userId == null) return
    setError(null)
    setAssigning(true)
    try {
      await updateCita(numId, { veterinario_id: user.userId })
      queryClient.invalidateQueries({ queryKey: citasKeys().detail(numId) })
      queryClient.invalidateQueries({ queryKey: citasKeys().agenda({ page: 1, page_size: 20 }) })
      toast.success('Cita asignada a ti correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al asignar.'
      setError(msg)
      toast.error(msg)
    } finally {
      setAssigning(false)
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
  const displayEstado = edited ? estado : (cita.estado ?? 'pendiente')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/citas" className="text-primary-600 hover:underline text-sm">
          ← Volver a agenda
        </Link>
      </div>
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Card
        title={`Cita #${cita.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {showStateButtons && estadoActual === 'pendiente' && puedeAsignarVet && (
              <>
                <Button onClick={() => handleCambiarEstado('confirmada')} loading={changingState}>
                  Confirmar cita
                </Button>
                <Button variant="ghost" onClick={() => handleCambiarEstado('cancelada')} loading={changingState}>
                  Cancelar cita
                </Button>
              </>
            )}
            {showStateButtons && estadoActual === 'confirmada' && puedeAsignarVet && (
              <>
                <p className="text-sm text-amber-700 font-medium px-2">
                  En espera de consulta del veterinario
                </p>
                <Button variant="ghost" onClick={() => handleCambiarEstado('cancelada')} loading={changingState}>
                  Cancelar cita
                </Button>
              </>
            )}
            {canAssignMe && (
              <Button
                variant="secondary"
                onClick={handleAsignarme}
                loading={assigning}
              >
                Asignarme
              </Button>
            )}
            {showForm ? (
              <>
                <Button onClick={handleSave} loading={saving}>
                  Guardar cambios
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFecha(toDatetimeLocal(cita.fecha))
                    const inList = motivosList.some((m) => m.nombre === (cita.motivo ?? ''))
                    setMotivoPredefinido(inList ? (cita.motivo ?? '') : 'otro')
                    setMotivoOtro(inList ? '' : (cita.motivo ?? ''))
                    setEstado(cita.estado ?? 'pendiente')
                    setEdited(false)
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setFecha(toDatetimeLocal(cita.fecha))
                  const inList = motivosList.some((m) => m.nombre === (cita.motivo ?? ''))
                  setMotivoPredefinido(inList ? (cita.motivo ?? '') : 'otro')
                  setMotivoOtro(inList ? '' : (cita.motivo ?? ''))
                  setEstado(cita.estado ?? 'pendiente')
                  setEdited(true)
                }}
              >
                Editar
              </Button>
            )}
          </div>
        }
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Mascota</dt>
            <dd className="mt-0.5">
              <Link
                to={`/mascotas/${cita.mascota_id}`}
                className="text-primary-600 hover:underline"
              >
                {mascotasMap.get(cita.mascota_id) ?? `#${cita.mascota_id}`}
              </Link>
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
              disabled={saving}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Motivo</label>
              <select
                value={motivoPredefinido}
                onChange={(e) => setMotivoPredefinido(e.target.value)}
                disabled={saving}
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Seleccionar motivo</option>
                {motivosList.map((m) => (
                  <option key={m.id} value={m.nombre}>
                    {m.nombre}
                  </option>
                ))}
                <option value="otro">Otro (especificar)</option>
              </select>
              {motivoPredefinido === 'otro' && (
                <Input
                  className="mt-2"
                  value={motivoOtro}
                  onChange={(e) => setMotivoOtro(e.target.value)}
                  placeholder="Indique el motivo..."
                  maxLength={200}
                  disabled={saving}
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
              <select
                value={displayEstado}
                onChange={(e) => setEstado(e.target.value)}
                disabled={saving}
                className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
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
                    disabled={assigningVet}
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
              <dt className="text-sm font-medium text-gray-500">Motivo</dt>
              <dd className="mt-0.5 text-gray-900">{cita.motivo ?? '—'}</dd>
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
                  {cita.estado ?? 'pendiente'}
                </span>
              </dd>
            </div>
          </dl>
        )}
      </Card>
      {(user?.rolId === ROLES.VETERINARIO || user?.rolId === ROLES.ADMIN) && cita?.estado === 'confirmada' && (
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
