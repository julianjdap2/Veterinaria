import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCliente } from './api'
import { clientesKeys } from './hooks/useClientes'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

export function ClienteCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createCliente,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientesKeys().list({ page: 1, page_size: 20 }) })
      toast.success('Cliente creado correctamente')
      navigate(`/clientes/${data.id}`)
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al crear cliente.'
      setError(msg)
      toast.error(msg)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nuevo cliente</h1>
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
              Crear cliente
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/clientes')}
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
