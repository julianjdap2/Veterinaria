import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCreateUsuario, useMisPermisosAdmin } from './hooks/useUsuarios'
import { fetchPerfilesAdminEmpresa } from './api'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
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
  const [perfilAdminId, setPerfilAdminId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useCreateUsuario()
  const { data: permisosAdmin, isLoading: loadingPermisos } = useMisPermisosAdmin()
  const { data: perfilesAdmin } = useQuery({
    queryKey: ['usuarios', 'perfiles-admin'],
    queryFn: fetchPerfilesAdminEmpresa,
    enabled: rolId === ROLES.ADMIN,
  })
  const canCreate = permisosAdmin?.admin_gestion_usuarios === true

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canCreate) return
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
      {
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        rol_id: rolId,
        perfil_admin_id:
          rolId === ROLES.ADMIN && perfilAdminId !== '' ? (perfilAdminId as number) : null,
      },
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
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Usuarios', to: '/usuarios' }, { label: 'Nuevo' }]}
        title="Nuevo usuario"
        subtitle="Cuenta en tu empresa: rol, email y contraseña inicial."
        actions={
          <Link to="/usuarios" className="text-sm font-medium text-primary-600 hover:text-primary-800">
            ← Volver al listado
          </Link>
        }
      />
      <Card title="Datos del usuario">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          {!loadingPermisos && permisosAdmin && !permisosAdmin.admin_gestion_usuarios ? (
            <Alert variant="warning">
              No tienes permiso para crear usuarios. Contacta al superadmin o a un administrador con gestión de
              usuarios habilitada.
            </Alert>
          ) : null}
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
              disabled={mutation.isPending || !canCreate || loadingPermisos}
            />
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@ejemplo.com"
              disabled={mutation.isPending || !canCreate || loadingPermisos}
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
              disabled={mutation.isPending || !canCreate || loadingPermisos}
            />
            <div className="w-full">
              <label htmlFor="rol" className="mb-1.5 block text-sm font-medium text-slate-700">
                Rol
              </label>
              <select
                id="rol"
                value={rolId}
                onChange={(e) => {
                  const r = Number(e.target.value)
                  setRolId(r)
                  if (r !== ROLES.ADMIN) setPerfilAdminId('')
                }}
                disabled={mutation.isPending || !canCreate || loadingPermisos}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value={ROLES.ADMIN}>{ROL_LABELS[ROLES.ADMIN]}</option>
                <option value={ROLES.VETERINARIO}>{ROL_LABELS[ROLES.VETERINARIO]}</option>
                <option value={ROLES.RECEPCION}>{ROL_LABELS[ROLES.RECEPCION]}</option>
              </select>
            </div>
          </div>
          {rolId === ROLES.ADMIN ? (
            <div className="w-full max-w-xl">
              <label htmlFor="perfil-admin" className="mb-1.5 block text-sm font-medium text-slate-700">
                Perfil de permisos admin (opcional)
              </label>
              <select
                id="perfil-admin"
                value={perfilAdminId === '' ? '' : String(perfilAdminId)}
                onChange={(e) => {
                  const v = e.target.value
                  setPerfilAdminId(v === '' ? '' : Number(v))
                }}
                disabled={mutation.isPending || !canCreate || loadingPermisos}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value="">Sin perfil — usar plantilla de empresa</option>
                {(perfilesAdmin ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.slug})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Los perfiles los define el superadmin en Empresas. Si no eliges uno, aplican los permisos por defecto de
                la empresa.
              </p>
            </div>
          ) : null}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={mutation.isPending || !canCreate || loadingPermisos}>
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
