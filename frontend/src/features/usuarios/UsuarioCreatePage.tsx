import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateUsuario } from './hooks/useUsuarios'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ROLES, ROL_LABELS } from '../../core/constants'
import { ApiError } from '../../api/errors'

export function UsuarioCreatePage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState<number>(ROLES.RECEPCION)
  const [error, setError] = useState<string | null>(null)

  const mutation = useCreateUsuario()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      toast.warning('El nombre es obligatorio.')
      return
    }
    if (!email.trim()) {
      setError('El email es obligatorio.')
      toast.warning('El email es obligatorio.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      toast.warning('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    mutation.mutate(
      { nombre: nombre.trim(), email: email.trim(), password, rol_id: rolId },
      {
        onSuccess: () => {
          toast.success('Usuario creado correctamente')
          navigate('/usuarios')
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : 'Error al crear usuario.'
          setError(msg)
          toast.error(msg)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nuevo usuario</h1>
      <Card title="Datos del usuario">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
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
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@ejemplo.com"
              disabled={mutation.isPending}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="password"
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Mín. 8 caracteres"
              disabled={mutation.isPending}
            />
            <div className="w-full">
              <label htmlFor="rol" className="mb-1.5 block text-sm font-medium text-slate-700">
                Rol
              </label>
              <select
                id="rol"
                value={rolId}
                onChange={(e) => setRolId(Number(e.target.value))}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value={ROLES.ADMIN}>{ROL_LABELS[ROLES.ADMIN]}</option>
                <option value={ROLES.VETERINARIO}>{ROL_LABELS[ROLES.VETERINARIO]}</option>
                <option value={ROLES.RECEPCION}>{ROL_LABELS[ROLES.RECEPCION]}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creando...' : 'Crear usuario'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/usuarios')}
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
