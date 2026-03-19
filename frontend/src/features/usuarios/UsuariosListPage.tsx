import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth-store'
import { useUsuarios } from './hooks/useUsuarios'
import { updateUsuarioActivo } from './api'
import { usuariosKeys } from './hooks/useUsuarios'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { Pagination } from '../../shared/ui/Pagination'
import { Alert } from '../../shared/ui/Alert'
import { ROL_LABELS, DEFAULT_PAGE_SIZE } from '../../core/constants'
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

  const currentUserId = user?.userId

  useEffect(() => {
    if (isError) toast.error('No se pudo cargar el listado. Solo administradores pueden acceder.')
  }, [isError])

  async function handleDesactivar(id: number, nombre: string) {
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
        <Link to="/usuarios/nuevo">
          <Button>Nuevo usuario</Button>
        </Link>
      </div>

      <Card title="Listado">
        <div className="space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}
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
                      <TableTh>Estado</TableTh>
                      <TableTh className="text-right">Acciones</TableTh>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <td colSpan={6} className="px-4 py-3 text-center text-sm text-gray-500">
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
                            {u.id === currentUserId ? (
                              <span className="text-slate-400 text-sm">Tú</span>
                            ) : u.activo ? (
                              <Button variant="ghost" onClick={() => handleDesactivar(u.id, u.nombre)}>
                                Desactivar
                              </Button>
                            ) : (
                              <Button variant="primary" onClick={() => handleReactivar(u.id, u.nombre)}>
                                Reactivar
                              </Button>
                            )}
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
    </div>
  )
}
