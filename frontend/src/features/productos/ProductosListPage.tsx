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
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { DataListPanel } from '../../shared/ui/DataListPanel'
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { SettingsPanel } from '../../shared/ui/SettingsPanel'
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
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Inicio', to: '/dashboard' }, { label: 'Inventario' }]}
        title="Inventario"
        subtitle="Productos, stock, categorías y carga masiva CSV (si tu perfil lo permite)."
      />

      <div className="flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-wrap sm:overflow-visible">
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
        <SettingsPanel kicker="Alta" title="Nuevo producto" description="Completa los datos básicos; luego podrás editar desde la lista.">
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
        </SettingsPanel>
      )}

      <DataListPanel kicker="Catálogo" title="Productos" description="Listado filtrado; la alerta «Stock bajo» depende del mínimo configurado.">
        {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-slate-500">No hay productos. Crea uno o ajusta los filtros.</p>
        )}
        {!isLoading && items.length > 0 && (
          <Table plain className="min-w-[960px]">
            <TableHead>
              <TableRow header>
                <TableTh>Nombre</TableTh>
                <TableTh>Cód. / EAN</TableTh>
                <TableTh>Categoría</TableTh>
                <TableTh>Fabricante</TableTh>
                <TableTh>Presentación</TableTh>
                <TableTh>Unidad</TableTh>
                <TableTh>Precio</TableTh>
                <TableTh>Stock</TableTh>
                <TableTh>Mín.</TableTh>
                <TableTh>Estado</TableTh>
                <TableTh className="w-24 text-right">Acciones</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} className={p.alerta_stock_bajo ? 'bg-amber-50/80 hover:bg-amber-50' : ''}>
                  <TableTd className="max-w-[14rem] font-medium text-slate-900">
                    {p.nombre}
                    {p.alerta_stock_bajo ? (
                      <span className="ml-1.5 inline-flex rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950 ring-1 ring-amber-300/80">
                        Stock bajo
                      </span>
                    ) : null}
                  </TableTd>
                  <TableTd className="text-slate-700">
                    {p.cod_articulo || p.ean ? [p.cod_articulo, p.ean].filter(Boolean).join(' / ') : '—'}
                  </TableTd>
                  <TableTd>{categorias.find((c) => c.id === p.categoria_id)?.nombre ?? '—'}</TableTd>
                  <TableTd className="text-slate-700">{p.fabricante ?? '—'}</TableTd>
                  <TableTd className="max-w-[120px] truncate text-slate-600" title={p.presentacion ?? ''}>
                    {p.presentacion ?? '—'}
                  </TableTd>
                  <TableTd>{p.unidad ?? '—'}</TableTd>
                  <TableTd className="tabular-nums font-medium">{p.precio != null ? Number(p.precio).toFixed(2) : '—'}</TableTd>
                  <TableTd className="font-semibold text-slate-900">{p.stock_actual}</TableTd>
                  <TableTd className="tabular-nums text-slate-600">{p.stock_minimo}</TableTd>
                  <TableTd>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                        p.activo
                          ? 'bg-emerald-100 text-emerald-800 ring-emerald-300/80'
                          : 'bg-slate-100 text-slate-600 ring-slate-200'
                      }`}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableTd>
                  <TableTd className="text-right">
                    <Link
                      to={`/productos/${p.id}/editar`}
                      className="inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/90 transition hover:bg-emerald-50"
                    >
                      Editar
                    </Link>
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
      </DataListPanel>
    </div>
  )
}
