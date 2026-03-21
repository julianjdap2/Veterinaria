import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useClientes } from './hooks/useClientes'
import { deleteCliente, updateClienteActivo } from './api'
import { clientesKeys } from './hooks/useClientes'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { Pagination } from '../../shared/ui/Pagination'
import { Alert } from '../../shared/ui/Alert'
import { DEFAULT_PAGE_SIZE } from '../../core/constants'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

export function ClientesListPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [busqueda, setBusqueda] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filters = {
    page,
    page_size: pageSize,
    busqueda: busqueda.trim() || undefined,
    incluir_inactivos: incluirInactivos,
  }
  const { data, isLoading, isError, error: queryError } = useClientes(filters)

  async function handleDelete(id: number, nombreCliente: string) {
    if (!window.confirm(`¿Desactivar cliente "${nombreCliente}"?`)) return
    setError(null)
    try {
      await deleteCliente(id)
      queryClient.invalidateQueries({ queryKey: clientesKeys().list(filters) })
      toast.success('Cliente desactivado correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al desactivar.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleReactivar(id: number, nombreCliente: string) {
    if (!window.confirm(`¿Reactivar cliente "${nombreCliente}"?`)) return
    setError(null)
    try {
      await updateClienteActivo(id, true)
      queryClient.invalidateQueries({ queryKey: clientesKeys().list(filters) })
      toast.success('Cliente reactivado correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al reactivar.'
      setError(msg)
      toast.error(msg)
    }
  }

  const showError = error ?? (isError && queryError instanceof ApiError ? queryError.message : null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Link to="/clientes/nuevo">
          <Button>Nuevo cliente</Button>
        </Link>
      </div>

      <Card title="Listado">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Input
              placeholder="Buscar por nombre o documento"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPage(1)
              }}
              className="max-w-md"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirInactivos}
                onChange={(e) => {
                  setIncluirInactivos(e.target.checked)
                  setPage(1)
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Incluir inactivos
            </label>
          </div>
          {showError && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {showError}
            </Alert>
          )}
          {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}
          {data && (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableTh>Nombre</TableTh>
                    <TableTh>Documento</TableTh>
                    <TableTh>Teléfono</TableTh>
                    <TableTh>Email</TableTh>
                    <TableTh>Estado</TableTh>
                    <TableTh className="text-right">Acciones</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id} className={!c.activo ? 'bg-gray-50' : ''}>
                      <TableTd>
                        <Link
                          to={`/clientes/${c.id}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          {c.nombre}
                        </Link>
                      </TableTd>
                      <TableTd>{c.documento ?? '—'}</TableTd>
                      <TableTd>{c.telefono ?? '—'}</TableTd>
                      <TableTd>{c.email ?? '—'}</TableTd>
                      <TableTd>
                        {c.activo ? (
                          <span className="text-green-600 text-sm">Activo</span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Inactivo
                          </span>
                        )}
                      </TableTd>
                      <TableTd className="text-right">
                        {c.activo ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleDelete(c.id, c.nombre)}
                          >
                            Desactivar
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => handleReactivar(c.id, c.nombre)}
                          >
                            Reactivar
                          </Button>
                        )}
                      </TableTd>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={data.page}
                pageSize={data.page_size}
                total={data.total}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
