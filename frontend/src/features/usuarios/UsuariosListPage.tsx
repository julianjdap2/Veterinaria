import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth-store'
import { useUsuarios, useMisPermisosAdmin } from './hooks/useUsuarios'
import { fetchPerfilesAdminEmpresa, patchUsuario, resetUsuarioPassword, updateUsuarioActivo } from './api'
import { usuariosKeys } from './hooks/useUsuarios'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { Pagination } from '../../shared/ui/Pagination'
import { Alert } from '../../shared/ui/Alert'
import { ROL_LABELS, DEFAULT_PAGE_SIZE, ROLES } from '../../core/constants'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

export function UsuariosListPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [error, setError] = useState<string | null>(null)

  const filters = { page, page_size: pageSize }
  const { data, isLoading, isError } = useUsuarios(filters)
  const { data: permisosAdmin } = useMisPermisosAdmin()
  const canManageUsers = permisosAdmin?.admin_gestion_usuarios === true

  const { data: perfilesAdmin } = useQuery({
    queryKey: ['usuarios', 'perfiles-admin'],
    queryFn: fetchPerfilesAdminEmpresa,
  })
  const perfilSlugById = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of perfilesAdmin ?? []) m.set(p.id, p.slug)
    return m
  }, [perfilesAdmin])

  const currentUserId = user?.userId
  const [pwdModal, setPwdModal] = useState<{ id: number; nombre: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [perfilModal, setPerfilModal] = useState<{
    id: number
    nombre: string
    perfil_admin_id: number | null | undefined
  } | null>(null)
  const [perfilPick, setPerfilPick] = useState<string>('')
  const [perfilSaving, setPerfilSaving] = useState(false)

  useEffect(() => {
    if (isError) toast.error('No se pudo cargar el listado. Solo administradores pueden acceder.')
  }, [isError])

  async function handleDesactivar(id: number, nombre: string) {
    if (!canManageUsers) return
    if (!window.confirm(`¿Desactivar usuario "${nombre}"? No podrá iniciar sesión.`)) return
    setError(null)
    try {
      await updateUsuarioActivo(id, false)
      queryClient.invalidateQueries({ queryKey: usuariosKeys(filters) })
      toast.success('Usuario desactivado correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al desactivar.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleReactivar(id: number, nombre: string) {
    if (!canManageUsers) return
    if (!window.confirm(`¿Reactivar usuario "${nombre}"?`)) return
    setError(null)
    try {
      await updateUsuarioActivo(id, true)
      queryClient.invalidateQueries({ queryKey: usuariosKeys(filters) })
      toast.success('Usuario reactivado correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al reactivar.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleResetPassword() {
    if (!canManageUsers) return
    if (!pwdModal) return
    if (newPassword.length < 8) {
      toast.warning('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== newPassword2) {
      toast.warning('Las contraseñas no coinciden.')
      return
    }
    setPwdLoading(true)
    try {
      await resetUsuarioPassword(pwdModal.id, newPassword)
      queryClient.invalidateQueries({ queryKey: usuariosKeys(filters) })
      toast.success('Contraseña actualizada')
      setPwdModal(null)
      setNewPassword('')
      setNewPassword2('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al cambiar la contraseña.')
    } finally {
      setPwdLoading(false)
    }
  }

  async function savePerfilAdmin() {
    if (!perfilModal || !canManageUsers) return
    setPerfilSaving(true)
    try {
      const v = perfilPick === '' ? null : Number(perfilPick)
      await patchUsuario(perfilModal.id, { perfil_admin_id: v })
      queryClient.invalidateQueries({ queryKey: usuariosKeys(filters) })
      toast.success('Perfil actualizado')
      setPerfilModal(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al asignar perfil')
    } finally {
      setPerfilSaving(false)
    }
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <Card title="Error">
          <p className="text-red-600">No se pudo cargar el listado. Solo administradores pueden acceder.</p>
        </Card>
      </div>
    )
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        {canManageUsers ? (
          <Link to="/usuarios/nuevo">
            <Button>Nuevo usuario</Button>
          </Link>
        ) : (
          <span className="text-xs text-slate-500">Sin permiso para crear o editar usuarios</span>
        )}
      </div>

      <Card title="Listado">
        <div className="space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}
          {permisosAdmin && !permisosAdmin.admin_gestion_usuarios ? (
            <Alert variant="warning">
              Tu perfil no incluye <strong>gestión de usuarios</strong>. Solo puedes consultar el listado; no podrás
              cambiar contraseñas ni activar/desactivar cuentas.
            </Alert>
          ) : null}
          {isLoading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableTh>ID</TableTh>
                      <TableTh>Nombre</TableTh>
                      <TableTh>Email</TableTh>
                      <TableTh>Rol</TableTh>
                      <TableTh>Perfil admin</TableTh>
                      <TableTh>Estado</TableTh>
                      <TableTh className="text-right min-w-[200px]">Acciones</TableTh>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <td colSpan={7} className="px-4 py-3 text-center text-sm text-gray-500">
                          No hay usuarios. Crea el primero desde «Nuevo usuario».
                        </td>
                      </TableRow>
                    ) : (
                      items.map((u) => (
                        <TableRow key={u.id} className={!u.activo ? 'bg-slate-50' : ''}>
                          <TableTd>{u.id}</TableTd>
                          <TableTd>{u.nombre}</TableTd>
                          <TableTd>{u.email}</TableTd>
                          <TableTd>{ROL_LABELS[u.rol_id as keyof typeof ROL_LABELS] ?? u.rol_id}</TableTd>
                          <TableTd className="text-xs text-slate-600">
                            {u.rol_id === ROLES.ADMIN ? (
                              u.perfil_admin_id ? (
                                perfilSlugById.get(u.perfil_admin_id) ?? `#${u.perfil_admin_id}`
                              ) : (
                                <span className="text-slate-400">plantilla</span>
                              )
                            ) : (
                              '—'
                            )}
                          </TableTd>
                          <TableTd>
                            {u.activo ? (
                              <span className="text-emerald-600 text-sm">Activo</span>
                            ) : (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                Inactivo
                              </span>
                            )}
                          </TableTd>
                          <TableTd className="text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {canManageUsers ? (
                                <>
                                  {u.rol_id === ROLES.ADMIN ? (
                                    <Button
                                      variant="secondary"
                                      className="text-xs"
                                      onClick={() => {
                                        setPerfilPick(
                                          u.perfil_admin_id != null ? String(u.perfil_admin_id) : '',
                                        )
                                        setPerfilModal({
                                          id: u.id,
                                          nombre: u.nombre,
                                          perfil_admin_id: u.perfil_admin_id,
                                        })
                                      }}
                                    >
                                      Perfil
                                    </Button>
                                  ) : null}
                                  <Button
                                    variant="secondary"
                                    className="text-xs"
                                    onClick={() => {
                                      setPwdModal({ id: u.id, nombre: u.nombre })
                                      setNewPassword('')
                                      setNewPassword2('')
                                    }}
                                  >
                                    Contraseña
                                  </Button>
                                </>
                              ) : null}
                              {u.id === currentUserId ? (
                                <span className="text-slate-400 text-xs">Tú</span>
                              ) : canManageUsers ? (
                                u.activo ? (
                                  <Button variant="ghost" className="text-xs" onClick={() => handleDesactivar(u.id, u.nombre)}>
                                    Desactivar
                                  </Button>
                                ) : (
                                  <Button variant="primary" className="text-xs" onClick={() => handleReactivar(u.id, u.nombre)}>
                                    Reactivar
                                  </Button>
                                )
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </div>
                          </TableTd>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {total > 0 && (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </Card>

      <Modal
        open={!!perfilModal}
        title={perfilModal ? `Perfil admin — ${perfilModal.nombre}` : 'Perfil'}
        onClose={() => !perfilSaving && setPerfilModal(null)}
      >
        <p className="mb-3 text-sm text-slate-600">
          Asigna un perfil definido por el superadmin o vuelve a la plantilla por defecto de la empresa.
        </p>
        <select
          value={perfilPick}
          onChange={(e) => setPerfilPick(e.target.value)}
          disabled={perfilSaving}
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Sin perfil (plantilla empresa)</option>
          {(perfilesAdmin ?? []).map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.nombre} ({p.slug})
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button onClick={() => void savePerfilAdmin()} loading={perfilSaving}>
            Guardar
          </Button>
          <Button variant="secondary" onClick={() => setPerfilModal(null)} disabled={perfilSaving}>
            Cancelar
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!pwdModal}
        title={pwdModal ? `Nueva contraseña — ${pwdModal.nombre}` : 'Contraseña'}
        onClose={() => !pwdLoading && setPwdModal(null)}
      >
        <p className="mb-3 text-sm text-slate-600">
          El usuario deberá usar esta contraseña en el próximo inicio de sesión. Mínimo 8 caracteres.
        </p>
        <div className="space-y-3">
          <Input
            type="password"
            label="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            disabled={pwdLoading}
          />
          <Input
            type="password"
            label="Repetir contraseña"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            autoComplete="new-password"
            disabled={pwdLoading}
          />
          <div className="flex gap-2 pt-2">
            <Button onClick={handleResetPassword} loading={pwdLoading}>
              Guardar
            </Button>
            <Button variant="secondary" onClick={() => setPwdModal(null)} disabled={pwdLoading}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
