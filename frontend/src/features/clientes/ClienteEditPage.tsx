import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useClienteDetail } from './hooks/useClienteDetail'
import { updateCliente } from './api'
import { clientesKeys } from './hooks/useClientes'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

export function ClienteEditPage() {
  const { id } = useParams<{ id: string }>()
  const numId = id ? parseInt(id, 10) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: cliente, isLoading, isError } = useClienteDetail(numId)

  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cliente) {
      setNombre(cliente.nombre ?? '')
      setDocumento(cliente.documento ?? '')
      setTelefono(cliente.telefono ?? '')
      setEmail(cliente.email ?? '')
      setDireccion(cliente.direccion ?? '')
    }
  }, [cliente])

  const mutation = useMutation({
    mutationFn: (payload: { nombre: string; documento?: string; telefono?: string; email?: string; direccion?: string }) =>
      updateCliente(numId!, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientes', numId] })
      queryClient.invalidateQueries({ queryKey: clientesKeys().list({ page: 1, page_size: 20 }) })
      toast.success('Cliente actualizado correctamente')
      navigate(`/clientes/${data.id}`)
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al guardar.'
      setError(msg)
      toast.error(msg)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!numId) return
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      toast.warning('El nombre es obligatorio.')
      return
    }
    mutation.mutate({
      nombre: nombre.trim(),
      documento: documento.trim() || undefined,
      telefono: telefono.trim() || undefined,
      email: email.trim() || undefined,
      direccion: direccion.trim() || undefined,
    })
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
    return <p className="text-slate-500">Cargando...</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[
          { label: 'Clientes', to: '/clientes' },
          { label: cliente.nombre, to: `/clientes/${numId}` },
          { label: 'Editar' },
        ]}
        title="Editar cliente"
        subtitle="Actualiza datos de contacto del tutor."
        actions={
          <Link to={`/clientes/${numId}`} className="text-sm font-medium text-primary-600 hover:text-primary-800">
            ← Volver a la ficha
          </Link>
        }
      />
      <Card title="Datos del cliente">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Nombre completo"
              disabled={mutation.isPending}
            />
            <Input
              label="Documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Nº documento"
              disabled={mutation.isPending}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 612 000 000"
              disabled={mutation.isPending}
            />
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              disabled={mutation.isPending}
            />
          </div>
          <Input
            label="Dirección"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Calle, número, ciudad"
            disabled={mutation.isPending}
          />
          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={mutation.isPending}>
              Guardar cambios
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/clientes/${numId}`)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
