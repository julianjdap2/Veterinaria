import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useEspecies } from '../catalogo/hooks/useEspecies'
import { useAllRazas } from '../catalogo/hooks/useRazas'
import { useMascotas } from './hooks/useMascotas'
import { deleteMascota, updateMascotaActivo } from './api'
import { mascotasKeys } from './hooks/useMascotas'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { DataListPanel } from '../../shared/ui/DataListPanel'
import { Input } from '../../shared/ui/Input'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { Pagination } from '../../shared/ui/Pagination'
import { Alert } from '../../shared/ui/Alert'
import { DEFAULT_PAGE_SIZE } from '../../core/constants'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

export function MascotasListPage() {
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
  const { data, isLoading, isError, error: queryError } = useMascotas(filters)
  const { data: especies = [] } = useEspecies()
  const { data: razas = [] } = useAllRazas()
  const especiesMap = new Map(especies.map((s) => [s.id, s.nombre]))
  const razasMap = new Map(razas.map((r) => [r.id, r.nombre ?? `Raza ${r.id}`]))

  async function handleDelete(id: number, nombreMascota: string) {
    if (!window.confirm(`¿Desactivar mascota "${nombreMascota}"?`)) return
    setError(null)
    try {
      await deleteMascota(id)
      queryClient.invalidateQueries({ queryKey: mascotasKeys().list(filters) })
      toast.success('Mascota desactivada correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al desactivar.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleReactivar(id: number, nombreMascota: string) {
    if (!window.confirm(`¿Reactivar mascota "${nombreMascota}"?`)) return
    setError(null)
    try {
      await updateMascotaActivo(id, true)
      queryClient.invalidateQueries({ queryKey: mascotasKeys().list(filters) })
      toast.success('Mascota reactivada correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al reactivar.'
      setError(msg)
      toast.error(msg)
    }
  }

  const showError = error ?? (isError && queryError instanceof ApiError ? queryError.message : null)

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Inicio', to: '/dashboard' }, { label: 'Mascotas' }]}
        title="Mascotas"
        subtitle="Pacientes vinculados a tutores. Búsqueda por nombre de mascota, dueño o documento."
        actions={
          <Link to="/mascotas/nuevo">
            <Button>Nueva mascota</Button>
          </Link>
        }
      />

      <DataListPanel kicker="Pacientes" title="Listado" description="Historial clínico y citas desde la ficha de cada mascota.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
            <Input
              placeholder="Buscar por mascota, nombre del dueño o documento"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPage(1)
              }}
              className="max-w-md"
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={incluirInactivos}
                onChange={(e) => {
                  setIncluirInactivos(e.target.checked)
                  setPage(1)
                }}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              Incluir inactivas
            </label>
          </div>
          {showError && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {showError}
            </Alert>
          )}
          {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
          {data && (
            <>
              <Table plain>
                <TableHead>
                  <TableRow header>
                    <TableTh>Nombre</TableTh>
                    <TableTh>Cliente</TableTh>
                    <TableTh>Especie / Raza</TableTh>
                    <TableTh>Sexo</TableTh>
                    <TableTh>Estado</TableTh>
                    <TableTh className="text-right">Acciones</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((m) => (
                    <TableRow key={m.id} className={!m.activo ? 'bg-slate-50/80' : ''}>
                      <TableTd>
                        <Link
                          to={`/mascotas/${m.id}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          {m.nombre}
                        </Link>
                      </TableTd>
                      <TableTd>
                        <Link
                          to={`/clientes/${m.cliente_id}`}
                          className="text-primary-600 hover:underline text-sm"
                        >
                          {m.cliente_nombre ?? `Cliente #${m.cliente_id}`}
                        </Link>
                      </TableTd>
                      <TableTd className="text-sm text-gray-600">
                        {m.especie_id != null ? especiesMap.get(m.especie_id) ?? `#${m.especie_id}` : '—'}
                        {' / '}
                        {m.raza_id != null ? razasMap.get(m.raza_id) ?? `#${m.raza_id}` : '—'}
                      </TableTd>
                      <TableTd>{m.sexo ?? '—'}</TableTd>
                      <TableTd>
                        {m.activo ? (
                          <span className="text-green-600 text-sm">Activa</span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Inactiva
                          </span>
                        )}
                      </TableTd>
                      <TableTd className="text-right">
                        {m.activo ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleDelete(m.id, m.nombre)}
                          >
                            Desactivar
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => handleReactivar(m.id, m.nombre)}
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
      </DataListPanel>
    </div>
  )
}
