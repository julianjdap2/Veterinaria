import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useProductoDetail, useUpdateProducto } from './hooks/useProductos'
import { fetchCategoriasProducto } from './api'
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

export function ProductoEditPage() {
  const { id } = useParams<{ id: string }>()
  const productId = id ? parseInt(id, 10) : null
  const [stockAjuste, setStockAjuste] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: producto, isLoading, isError } = useProductoDetail(productId)
  const { data: categorias = [] } = useQuery({
    queryKey: ['productos', 'categorias'],
    queryFn: fetchCategoriasProducto,
  })
  const updateMutation = useUpdateProducto()

  const [form, setForm] = useState<Partial<ProductoCreate> & { stock_ajuste?: number }>({})

  useEffect(() => {
    if (producto) {
      setForm({
        nombre: producto.nombre,
        categoria_id: producto.categoria_id,
        cod_articulo: producto.cod_articulo ?? '',
        ean: producto.ean ?? '',
        fabricante: producto.fabricante ?? '',
        presentacion: producto.presentacion ?? '',
        tipo: producto.tipo ?? 'medicamento',
        unidad: producto.unidad ?? 'unidad',
        precio: producto.precio != null ? Number(producto.precio) : null,
        stock_minimo: producto.stock_minimo ?? 0,
        activo: producto.activo,
      })
    }
  }, [producto])

  if (productId == null || isError || (!isLoading && !producto)) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Producto no encontrado.</p>
        <Link to="/productos" className="text-primary-600 hover:underline text-sm">
          ← Volver a inventario
        </Link>
      </div>
    )
  }

  if (isLoading || !producto) {
    return <p className="text-gray-500">Cargando...</p>
  }

  const currentForm = {
    nombre: form.nombre ?? producto.nombre,
    categoria_id: form.categoria_id ?? producto.categoria_id,
    cod_articulo: form.cod_articulo ?? producto.cod_articulo ?? '',
    ean: form.ean ?? producto.ean ?? '',
    fabricante: form.fabricante ?? producto.fabricante ?? '',
    presentacion: form.presentacion ?? producto.presentacion ?? '',
    tipo: form.tipo ?? producto.tipo ?? 'medicamento',
    unidad: form.unidad ?? producto.unidad ?? 'unidad',
    precio: form.precio !== undefined ? form.precio : (producto.precio != null ? Number(producto.precio) : null),
    stock_minimo: form.stock_minimo ?? producto.stock_minimo ?? 0,
    activo: form.activo ?? producto.activo,
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload: Partial<ProductoCreate> & { stock_ajuste?: number } = {
      nombre: currentForm.nombre.trim(),
      categoria_id: currentForm.categoria_id,
      cod_articulo: currentForm.cod_articulo || null,
      ean: currentForm.ean || null,
      fabricante: currentForm.fabricante || null,
      presentacion: currentForm.presentacion || null,
      tipo: currentForm.tipo || null,
      unidad: currentForm.unidad || null,
      precio: currentForm.precio,
      stock_minimo: currentForm.stock_minimo,
      activo: currentForm.activo,
    }
    const ajuste = stockAjuste.trim() ? parseInt(stockAjuste, 10) : undefined
    if (ajuste !== undefined && !Number.isNaN(ajuste)) payload.stock_ajuste = ajuste

    updateMutation.mutate(
      { id: productId, payload },
      {
        onSuccess: () => {
          toast.success('Producto actualizado')
          setStockAjuste('')
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Error al guardar.')
          toast.error('Error al actualizar')
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/productos" className="text-primary-600 hover:underline text-sm">
        ← Volver a inventario
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Editar producto</h1>

      <Card title={producto.nombre}>
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Input
            label="Nombre"
            value={currentForm.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            required
            disabled={updateMutation.isPending}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Categoría</label>
              <select
                value={currentForm.categoria_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoria_id: e.target.value ? Number(e.target.value) : null }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Cód. artículo"
              value={currentForm.cod_articulo}
              onChange={(e) => setForm((f) => ({ ...f, cod_articulo: e.target.value }))}
              disabled={updateMutation.isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="EAN"
              value={currentForm.ean}
              onChange={(e) => setForm((f) => ({ ...f, ean: e.target.value }))}
              disabled={updateMutation.isPending}
            />
            <Input
              label="Fabricante"
              value={currentForm.fabricante}
              onChange={(e) => setForm((f) => ({ ...f, fabricante: e.target.value }))}
              disabled={updateMutation.isPending}
            />
          </div>
          <Input
            label="Presentación"
            value={currentForm.presentacion}
            onChange={(e) => setForm((f) => ({ ...f, presentacion: e.target.value }))}
            disabled={updateMutation.isPending}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={currentForm.tipo ?? ''}
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
                value={currentForm.unidad ?? ''}
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
              value={currentForm.precio ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  precio: e.target.value ? parseFloat(e.target.value) : null,
                }))
              }
              disabled={updateMutation.isPending}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Stock actual</label>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                {producto.stock_actual}
              </p>
            </div>
            <Input
              type="number"
              min="0"
              label="Stock mínimo (alerta)"
              value={currentForm.stock_minimo}
              onChange={(e) => setForm((f) => ({ ...f, stock_minimo: parseInt(e.target.value, 10) || 0 }))}
              disabled={updateMutation.isPending}
            />
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <label className="mb-1 block text-sm font-medium text-amber-800">Ajuste de stock</label>
            <p className="mb-2 text-xs text-amber-700">
              Número positivo para sumar, negativo para restar. Ej: 10 o -5
            </p>
            <input
              type="number"
              value={stockAjuste}
              onChange={(e) => setStockAjuste(e.target.value)}
              placeholder="Opcional"
              className="w-32 rounded border border-amber-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currentForm.activo}
                onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                disabled={updateMutation.isPending}
              />
              <span className="text-sm">Activo</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={updateMutation.isPending}>
              Guardar cambios
            </Button>
            <Link to="/productos">
              <Button type="button" variant="secondary" disabled={updateMutation.isPending}>
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
