import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useProductos, useCreateProducto } from './hooks/useProductos'
import {
  fetchCategoriasProducto,
  createCategoriaProducto,
  uploadCargaMasivaProductos,
  downloadPlantillaCsv,
} from './api'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useMisPermisosAdmin } from '../usuarios/hooks/useUsuarios'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import type { ProductoCreate } from '../../api/types'

const UNIDADES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'caja', label: 'Caja' },
  { value: 'ml', label: 'ml' },
  { value: 'gr', label: 'gr' },
]

const defaultForm: ProductoCreate = {
  nombre: '',
  categoria_id: null,
  cod_articulo: '',
  ean: '',
  fabricante: '',
  presentacion: '',
  tipo: 'medicamento',
  unidad: 'unidad',
  precio: null,
  stock_minimo: 0,
  stock_inicial: 0,
}

export function ProductosListPage() {
  const authUser = useAuthStore((s) => s.user)
  const isTenantAdmin = authUser?.rolId === ROLES.ADMIN
  const { data: permisosAdmin } = useMisPermisosAdmin({ enabled: isTenantAdmin })
  const canCargaMasiva =
    !isTenantAdmin || permisosAdmin?.admin_carga_masiva_inventario === true

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProductoCreate>(defaultForm)
  const [error, setError] = useState<string | null>(null)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [cargaMasivaResult, setCargaMasivaResult] = useState<{
    creados: number
    errores: { fila: number; mensaje: string }[]
  } | null>(null)
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()
  const { data: categorias = [] } = useQuery({
    queryKey: ['productos', 'categorias'],
    queryFn: fetchCategoriasProducto,
  })
  const createCategoriaMutation = useMutation({
    mutationFn: (nombre: string) => createCategoriaProducto(nombre.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos', 'categorias'] })
    },
  })
  const { data, isLoading } = useProductos({
    page,
    page_size: 20,
    search: search || undefined,
    categoria_id: categoriaId === '' ? undefined : (categoriaId as number),
    incluir_inactivos: incluirInactivos,
  })
  const createMutation = useCreateProducto()

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = data?.page_size ?? 20

  function handleSubmitProduct(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    createMutation.mutate(
      {
        nombre: form.nombre.trim(),
        categoria_id: form.categoria_id ?? null,
        cod_articulo: form.cod_articulo?.trim() || null,
        ean: form.ean?.trim() || null,
        fabricante: form.fabricante?.trim() || null,
        presentacion: form.presentacion?.trim() || null,
        tipo: form.tipo || null,
        unidad: form.unidad || null,
        precio: form.precio != null ? Number(form.precio) : null,
        stock_minimo: form.stock_minimo ?? 0,
        activo: true,
        stock_inicial: form.stock_inicial ?? 0,
      },
      {
        onSuccess: () => {
          toast.success('Producto creado')
          setShowForm(false)
          setForm(defaultForm)
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Error al crear.')
          toast.error('Error al crear producto')
        },
      }
    )
  }

  async function handleDescargarPlantilla() {
    try {
      await downloadPlantillaCsv()
      toast.success('Plantilla descargada')
    } catch {
      toast.error('Error al descargar plantilla')
    }
  }

  async function handleFileCargaMasiva(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCargaMasivaResult(null)
    setUploadingCsv(true)
    try {
      const result = await uploadCargaMasivaProductos(file)
      setCargaMasivaResult(result)
      if (result.creados > 0) {
        queryClient.invalidateQueries({ queryKey: ['productos'] })
        toast.success(`${result.creados} producto(s) creado(s)`)
      }
      if (result.errores.length > 0) {
        toast.warning(`${result.errores.length} fila(s) con error`)
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al cargar CSV')
    } finally {
      setUploadingCsv(false)
    }
  }

  function handleCrearCategoria() {
    if (!nuevaCategoria.trim()) return
    createCategoriaMutation.mutate(nuevaCategoria, {
      onSuccess: () => {
        toast.success('Categoría creada')
        setNuevaCategoria('')
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Error al crear categoría')
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <div className="flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          <input
            type="text"
            placeholder="Buscar (nombre, EAN, código, fabricante)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[200px] shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-64"
          />
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))}
            className="min-w-[160px] shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={incluirInactivos}
              onChange={(e) => setIncluirInactivos(e.target.checked)}
            />
            Incluir inactivos
          </label>
          <Button onClick={() => setShowForm(true)}>Nuevo producto</Button>
          {canCargaMasiva ? (
            <>
              <Button variant="secondary" onClick={handleDescargarPlantilla} disabled={uploadingCsv}>
                Descargar plantilla CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileCargaMasiva}
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCsv}
              >
                {uploadingCsv ? 'Cargando...' : 'Cargar desde CSV'}
              </Button>
            </>
          ) : null}
          <Link to="/ventas/nueva">
            <Button variant="secondary">Nueva venta</Button>
          </Link>
        </div>
      </div>

      {cargaMasivaResult && (
        <Alert
          variant={cargaMasivaResult.errores.length > 0 ? 'warning' : 'success'}
          onDismiss={() => setCargaMasivaResult(null)}
        >
          <p className="font-medium">
            Carga masiva: {cargaMasivaResult.creados} producto(s) creado(s).
            {cargaMasivaResult.errores.length > 0 &&
              ` ${cargaMasivaResult.errores.length} error(es) en filas.`}
          </p>
          {cargaMasivaResult.errores.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm">
              {cargaMasivaResult.errores.slice(0, 10).map((err, i) => (
                <li key={i}>
                  Fila {err.fila}: {err.mensaje}
                </li>
              ))}
              {cargaMasivaResult.errores.length > 10 && (
                <li>… y {cargaMasivaResult.errores.length - 10} más</li>
              )}
            </ul>
          )}
        </Alert>
      )}

      {showForm && (
        <Card title="Nuevo producto">
          <form onSubmit={handleSubmitProduct} className="max-w-2xl space-y-4">
            {error && (
              <Alert variant="error" onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
              disabled={createMutation.isPending}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Categoría</label>
                <div className="flex gap-2">
                  <select
                    value={form.categoria_id ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoria_id: e.target.value ? Number(e.target.value) : null }))
                    }
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Nueva categoría"
                      value={nuevaCategoria}
                      onChange={(e) => setNuevaCategoria(e.target.value)}
                      className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={handleCrearCategoria}>
                      +
                    </Button>
                  </div>
                </div>
              </div>
              <Input
                label="Cód. artículo"
                value={form.cod_articulo ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, cod_articulo: e.target.value }))}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="EAN"
                value={form.ean ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, ean: e.target.value }))}
                disabled={createMutation.isPending}
              />
              <Input
                label="Fabricante"
                value={form.fabricante ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, fabricante: e.target.value }))}
                disabled={createMutation.isPending}
              />
            </div>
            <Input
              label="Presentación"
              placeholder="Ej. 100mg x 30 comprimidos"
              value={form.presentacion ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, presentacion: e.target.value }))}
              disabled={createMutation.isPending}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                <select
                  value={form.tipo ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value || null }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="medicamento">Medicamento</option>
                  <option value="insumo">Insumo</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Unidad</label>
                <select
                  value={form.unidad ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value || null }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  {UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                type="number"
                step="0.01"
                min="0"
                label="Precio"
                value={form.precio ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, precio: e.target.value ? parseFloat(e.target.value) : null }))
                }
                disabled={createMutation.isPending}
              />
              <Input
                type="number"
                min="0"
                label="Stock inicial"
                value={form.stock_inicial ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, stock_inicial: parseInt(e.target.value, 10) || 0 }))}
                disabled={createMutation.isPending}
              />
              <Input
                type="number"
                min="0"
                label="Stock mínimo (alerta)"
                value={form.stock_minimo ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, stock_minimo: parseInt(e.target.value, 10) || 0 }))}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={createMutation.isPending}>
                Crear
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Productos">
        {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-gray-500">No hay productos. Crea uno o ajusta los filtros.</p>
        )}
        {!isLoading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-2 pr-4">Nombre</th>
                  <th className="pb-2 pr-4">Cód. / EAN</th>
                  <th className="pb-2 pr-4">Categoría</th>
                  <th className="pb-2 pr-4">Fabricante</th>
                  <th className="pb-2 pr-4">Presentación</th>
                  <th className="pb-2 pr-4">Unidad</th>
                  <th className="pb-2 pr-4">Precio</th>
                  <th className="pb-2 pr-4">Stock</th>
                  <th className="pb-2 pr-4">Mín.</th>
                  <th className="pb-2 pr-4">Estado</th>
                  <th className="pb-2 pr-4 w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 ${p.alerta_stock_bajo ? 'bg-amber-50' : ''}`}
                  >
                    <td className="py-2 pr-4 font-medium">
                      {p.nombre}
                      {p.alerta_stock_bajo && (
                        <span className="ml-1.5 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                          Stock bajo
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {p.cod_articulo || p.ean ? [p.cod_articulo, p.ean].filter(Boolean).join(' / ') : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      {categorias.find((c) => c.id === p.categoria_id)?.nombre ?? '—'}
                    </td>
                    <td className="py-2 pr-4">{p.fabricante ?? '—'}</td>
                    <td className="py-2 pr-4 max-w-[120px] truncate" title={p.presentacion ?? ''}>
                      {p.presentacion ?? '—'}
                    </td>
                    <td className="py-2 pr-4">{p.unidad ?? '—'}</td>
                    <td className="py-2 pr-4">{p.precio != null ? Number(p.precio).toFixed(2) : '—'}</td>
                    <td className="py-2 pr-4 font-medium">{p.stock_actual}</td>
                    <td className="py-2 pr-4">{p.stock_minimo}</td>
                    <td className="py-2 pr-4">
                      <span className={p.activo ? 'text-green-600' : 'text-slate-400'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <Link
                        to={`/productos/${p.id}/editar`}
                        className="text-primary-600 hover:underline text-sm"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > pageSize && (
          <div className="mt-3 flex justify-end gap-2 text-sm">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="py-1">
              Página {page} de {Math.ceil(total / pageSize)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
