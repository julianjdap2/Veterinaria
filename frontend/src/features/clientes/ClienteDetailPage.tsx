import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useClienteDetail } from './hooks/useClienteDetail'
import { updateClienteActivo } from './api'
import { clientesKeys } from './hooks/useClientes'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import { useState } from 'react'

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const numId = id ? parseInt(id, 10) : null
  const queryClient = useQueryClient()
  const { data: cliente, isLoading, isError } = useClienteDetail(numId)
  const [error, setError] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState(false)

  async function handleReactivar() {
    if (!numId || !cliente) return
    setError(null)
    setReactivating(true)
    try {
      await updateClienteActivo(numId, true)
      queryClient.invalidateQueries({ queryKey: ['clientes', numId] })
      queryClient.invalidateQueries({ queryKey: clientesKeys().list({ page: 1, page_size: 20 }) })
      toast.success('Cliente reactivado correctamente')
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
        <Link to="/clientes" className="text-primary-600 hover:underline text-sm">
          ← Volver a clientes
        </Link>
        <p className="text-red-600">Cliente no encontrado.</p>
      </div>
    )
  }

  if (isLoading || !cliente) {
    return <p className="text-gray-500">Cargando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/clientes" className="text-primary-600 hover:underline text-sm">
          ← Volver a clientes
        </Link>
      </div>
      {!cliente.activo && (
        <Alert variant="warning">
          Este cliente está inactivo. No aparecerá en el listado por defecto. Puedes reactivarlo para volver a usarlo.
        </Alert>
      )}
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Card
        title={cliente.nombre}
        actions={
          <div className="flex items-center gap-2">
            <Link to={`/clientes/${numId}/editar`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            {!cliente.activo && (
              <Button
                variant="primary"
                loading={reactivating}
                onClick={handleReactivar}
              >
                Reactivar cliente
              </Button>
            )}
            <Link to="/clientes">
              <Button variant="secondary">Listado</Button>
            </Link>
          </div>
        }
      >
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Documento</dt>
            <dd className="mt-0.5 text-gray-900">{cliente.documento ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
            <dd className="mt-0.5 text-gray-900">{cliente.telefono ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-0.5 text-gray-900">{cliente.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Dirección</dt>
            <dd className="mt-0.5 text-gray-900">{cliente.direccion ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Estado</dt>
            <dd className="mt-0.5">{cliente.activo ? 'Activo' : 'Inactivo'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
