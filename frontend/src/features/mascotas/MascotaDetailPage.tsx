import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useEspecies } from '../catalogo/hooks/useEspecies'
import { useAllRazas } from '../catalogo/hooks/useRazas'
import { useConsultasByMascota } from '../consultas/hooks/useConsultasByMascota'
import { useMascotaDetail } from './hooks/useMascotaDetail'
import { updateMascotaActivo } from './api'
import { mascotasKeys } from './hooks/useMascotas'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import { useState } from 'react'

function formatDate(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return s
  }
}

function formatDateTime(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return s
  }
}

export function MascotaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const numId = id ? parseInt(id, 10) : null
  const queryClient = useQueryClient()
  const { data: mascota, isLoading, isError } = useMascotaDetail(numId)
  const { data: consultas = [], isLoading: loadingConsultas } = useConsultasByMascota(numId)
  const { data: especies = [] } = useEspecies()
  const { data: razas = [] } = useAllRazas()
  const especiesMap = new Map(especies.map((s) => [s.id, s.nombre]))
  const razasMap = new Map(razas.map((r) => [r.id, r.nombre ?? `Raza ${r.id}`]))
  const [error, setError] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState(false)

  async function handleReactivar() {
    if (!numId || !mascota) return
    setError(null)
    setReactivating(true)
    try {
      await updateMascotaActivo(numId, true)
      queryClient.invalidateQueries({ queryKey: ['mascotas', numId] })
      queryClient.invalidateQueries({ queryKey: mascotasKeys().list({ page: 1, page_size: 20 }) })
      toast.success('Mascota reactivada correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al reactivar.'
      setError(msg)
      toast.error(msg)
    } finally {
      setReactivating(false)
    }
  }

  if (numId == null || isError) {
    return (
      <div className="space-y-4">
        <Link to="/mascotas" className="text-primary-600 hover:underline text-sm">
          ← Volver a mascotas
        </Link>
        <p className="text-red-600">Mascota no encontrada.</p>
      </div>
    )
  }

  if (isLoading || !mascota) {
    return <p className="text-gray-500">Cargando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/mascotas" className="text-primary-600 hover:underline text-sm">
          ← Volver a mascotas
        </Link>
      </div>
      {!mascota.activo && (
        <Alert variant="warning">
          Esta mascota está inactiva. No aparecerá en el listado por defecto. Puedes reactivarla.
        </Alert>
      )}
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Card
        title={mascota.nombre}
        actions={
          <div className="flex items-center gap-2">
            {!mascota.activo && (
              <Button variant="primary" loading={reactivating} onClick={handleReactivar}>
                Reactivar mascota
              </Button>
            )}
            <Link to={`/clientes/${mascota.cliente_id}`}>
              <Button variant="secondary">Ver cliente</Button>
            </Link>
            <Link to="/mascotas">
              <Button variant="ghost">Listado</Button>
            </Link>
          </div>
        }
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Cliente</dt>
            <dd className="mt-0.5">
              <Link
                to={`/clientes/${mascota.cliente_id}`}
                className="text-primary-600 hover:underline"
              >
                Ver cliente #{mascota.cliente_id}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Especie</dt>
            <dd className="mt-0.5 text-gray-900">
              {mascota.especie_id != null
                ? especiesMap.get(mascota.especie_id) ?? `#${mascota.especie_id}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Raza</dt>
            <dd className="mt-0.5 text-gray-900">
              {mascota.raza_id != null
                ? razasMap.get(mascota.raza_id) ?? `#${mascota.raza_id}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Sexo</dt>
            <dd className="mt-0.5 text-gray-900">{mascota.sexo ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Fecha nacimiento</dt>
            <dd className="mt-0.5 text-gray-900">{formatDate(mascota.fecha_nacimiento)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Color</dt>
            <dd className="mt-0.5 text-gray-900">{mascota.color ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Peso (kg)</dt>
            <dd className="mt-0.5 text-gray-900">{mascota.peso ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Alergias</dt>
            <dd className="mt-0.5 text-gray-900">{mascota.alergias ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Estado</dt>
            <dd className="mt-0.5">{mascota.activo ? 'Activa' : 'Inactiva'}</dd>
          </div>
        </dl>
      </Card>

      <Card
        title="Historial clínico"
        actions={
          <Link to="/consultas/nuevo" state={{ mascotaId: numId }}>
            <Button>Nueva consulta</Button>
          </Link>
        }
      >
        {loadingConsultas && <p className="text-sm text-gray-500">Cargando...</p>}
        {!loadingConsultas && consultas.length === 0 && (
          <p className="text-sm text-gray-500">Sin consultas registradas.</p>
        )}
        {!loadingConsultas && consultas.length > 0 && (
          <ul className="space-y-3 divide-y divide-gray-100">
            {consultas.map((c) => (
              <li key={c.id} className="pt-2 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateTime(c.fecha_consulta ?? c.created_at)}
                    </p>
                    <p className="text-sm text-gray-600">{c.motivo_consulta ?? '—'}</p>
                    {c.diagnostico && (
                      <p className="mt-1 text-sm text-gray-500 truncate">{c.diagnostico}</p>
                    )}
                  </div>
                  <Link
                    to={`/consultas/${c.id}`}
                    className="shrink-0 text-sm text-primary-600 hover:underline"
                  >
                    Ver detalle / PDF / Email
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
