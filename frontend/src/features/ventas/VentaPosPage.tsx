import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useProductos } from '../productos/hooks/useProductos'
import { useClientes } from '../clientes/hooks/useClientes'
import { useCreateVenta, useVentaDetail } from './hooks/useVentas'
import type { Producto, Venta, VentaItemCreate } from '../../api/types'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

type CartItem = {
  producto_id: number
  nombre: string
  presentacion: string | null
  stock_actual: number
  precio_unitario: number
  cantidad: number
}

type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia_qr' | 'cyd'
type TipoOperacion = 'venta' | 'cambio' | 'devolucion'
type DocTipo = 'NIT' | 'CC' | 'CE' | 'PASAPORTE' | 'OTRO'
type TicketData = {
  tienda: string
  nit: string
  direccion: string
  telefono: string
  ubicacion: string
  politicas: string
}

const TICKET_STORAGE_KEY = 'ticket_datos_tienda_v1'
const defaultTicketData: TicketData = {
  tienda: 'Mi Veterinaria',
  nit: '',
  direccion: '',
  telefono: '',
  ubicacion: '',
  politicas: 'Cambios y devoluciones sujetos a politicas internas y estado del producto.',
}

function toPrice(v: Producto['precio']): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const inp =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200/70'
const sel =
  'w-full cursor-pointer appearance-none rounded-xl border border-slate-200/90 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-200/70'

export function VentaPosPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state ?? null) as {
    ventaOrigenId?: number
    tipoOperacion?: TipoOperacion
    motivo_cyd?: string | null
  } | null

  const [search, setSearch] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [clienteLabel, setClienteLabel] = useState<string>('Sin cliente')
  const [tipoDoc, setTipoDoc] = useState<DocTipo>('CC')
  const [cart, setCart] = useState<CartItem[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [tipoOperacion, setTipoOperacion] = useState<TipoOperacion>(state?.tipoOperacion ?? 'venta')
  const [motivoCyd, setMotivoCyd] = useState(state?.motivo_cyd ?? '')
  const [error, setError] = useState<string | null>(null)
  const [ticketData, setTicketData] = useState<TicketData>(defaultTicketData)

  const ventaOrigenId = state?.ventaOrigenId ?? null
  const { data: ventaOrigen } = useVentaDetail(ventaOrigenId, { enabled: ventaOrigenId != null })
  const { data: productosData, isLoading: loadingProductos } = useProductos({
    page: 1,
    page_size: 300,
    incluir_inactivos: false,
  })
  const { data: clientesData, isLoading: loadingClientes } = useClientes(
    { page: 1, page_size: 12, busqueda: clienteSearch.trim() || undefined },
    { enabled: clienteSearch.trim().length >= 2 }
  )
  const createMutation = useCreateVenta()

  const productos = productosData?.items ?? []
  const clientes = clientesData?.items ?? []

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return productos
    return productos.filter((p) => {
      const base = `${p.nombre} ${p.cod_articulo ?? ''} ${p.ean ?? ''}`.toLowerCase()
      return base.includes(q)
    })
  }, [productos, search])

  const total = cart.reduce((sum, it) => sum + it.precio_unitario * it.cantidad, 0)
  const itemsValidos = cart.filter((it) => it.cantidad > 0)
  const hasSinStock = tipoOperacion !== 'devolucion' && cart.some((it) => it.cantidad > it.stock_actual)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TICKET_STORAGE_KEY)
      if (raw) setTicketData((prev) => ({ ...prev, ...(JSON.parse(raw) as Partial<TicketData>) }))
    } catch {
      setTicketData(defaultTicketData)
    }
  }, [])

  useEffect(() => {
    if (tipoOperacion !== 'venta') setMetodoPago('cyd')
  }, [tipoOperacion])

  function addToCart(p: Producto) {
    const price = toPrice(p.precio)
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.producto_id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        const current = next[idx]
        const maxQty = Math.max(0, current.stock_actual)
        next[idx] = { ...current, cantidad: Math.min(maxQty, current.cantidad + 1) }
        return next
      }
      return [
        ...prev,
        {
          producto_id: p.id,
          nombre: p.nombre,
          presentacion: p.presentacion,
          stock_actual: p.stock_actual,
          precio_unitario: price,
          cantidad: p.stock_actual > 0 ? 1 : 0,
        },
      ]
    })
  }

  function removeItem(productoId: number) {
    setCart((prev) => prev.filter((it) => it.producto_id !== productoId))
  }

  function updateQty(productoId: number, qty: number) {
    setCart((prev) =>
      prev.map((it) => {
        if (it.producto_id !== productoId) return it
        const max = tipoOperacion === 'devolucion' ? 999999 : it.stock_actual
        return { ...it, cantidad: Math.max(0, Math.min(max, qty)) }
      })
    )
  }

  function cargarItemsVentaOrigen(v: Venta) {
    if (!v.items || v.items.length === 0) return
    const next: CartItem[] = v.items.map((it) => {
      const p = productos.find((x) => x.id === it.producto_id)
      return {
        producto_id: it.producto_id,
        nombre: p?.nombre ?? `Producto #${it.producto_id}`,
        presentacion: p?.presentacion ?? null,
        stock_actual: p?.stock_actual ?? 999999,
        precio_unitario: Number(it.precio_unitario) || 0,
        cantidad: it.cantidad,
      }
    })
    setCart(next)
  }

  function imprimirTicket(codigoInterno: string | null | undefined) {
    const refVenta = (codigoInterno && codigoInterno.trim()) || 'Venta (sin nº interno)'
    const lines = itemsValidos
      .map(
        (it) =>
          `<tr><td>${it.nombre}</td><td>${it.cantidad}</td><td>${it.precio_unitario.toFixed(2)}</td><td>${(
            it.cantidad * it.precio_unitario
          ).toFixed(2)}</td></tr>`
      )
      .join('')
    const win = window.open('', '_blank', 'width=420,height=700')
    if (!win) return
    win.document.write(`
      <html><head><title>Ticket ${refVenta}</title></head>
      <body style="font-family:Arial,sans-serif;padding:8px;font-size:12px">
        <h3 style="margin:0">${ticketData.tienda}</h3>
        <p style="margin:4px 0">NIT: ${ticketData.nit}<br/>Direccion: ${ticketData.direccion}<br/>Telefono: ${ticketData.telefono}<br/>Ubicacion: ${ticketData.ubicacion}</p>
        <hr/>
        <p style="margin:4px 0">${refVenta}<br/>Tipo: ${tipoOperacion.toUpperCase()}<br/>Medio de pago: ${metodoPago}<br/>Identificacion: ${tipoDoc}${clienteId ? ` - ${clienteLabel}` : ''}</p>
        <table width="100%" cellspacing="0" cellpadding="2">
          <thead><tr><th align="left">Item</th><th>Cant.</th><th>P.Unit</th><th>Subt.</th></tr></thead>
          <tbody>${lines}</tbody>
        </table>
        <hr/>
        <p style="text-align:right;font-weight:bold">Total: ${total.toFixed(2)}</p>
        <p style="white-space:pre-line">${ticketData.politicas}</p>
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (itemsValidos.length === 0) {
      setError('Agrega al menos un producto con cantidad mayor a cero.')
      return
    }
    if (hasSinStock) {
      setError('Hay productos sin stock suficiente.')
      return
    }
    const items: VentaItemCreate[] = itemsValidos.map((it) => ({
      producto_id: it.producto_id,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
    }))
    createMutation.mutate(
      {
        cliente_id: clienteId,
        consulta_id: null,
        metodo_pago: metodoPago,
        tipo_operacion: tipoOperacion,
        venta_origen_id: ventaOrigenId,
        motivo_cyd: tipoOperacion === 'venta' ? null : motivoCyd,
        items,
      },
      {
        onSuccess: (venta) => {
          toast.success('Venta POS registrada')
          imprimirTicket(venta.codigo_interno)
          navigate(`/ventas/${venta.id}`)
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Error al registrar venta POS.')
          toast.error('Error al registrar venta')
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Ventas', to: '/ventas' }, { label: 'POS' }]}
        title={`POS de ventas${tipoOperacion !== 'venta' ? ` (CYD: ${tipoOperacion})` : ''}`}
        subtitle="Búsqueda rápida, carrito y cobro."
        actions={
          <Link to="/ventas">
            <Button variant="ghost">Volver a ventas</Button>
          </Link>
        }
      />

      <Card
        clip={false}
        contentClassName="space-y-3 rounded-2xl bg-gradient-to-br from-slate-50/90 to-white p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Producto
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, código o EAN"
              className={inp}
            />
          </div>
          <div className="xl:col-span-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Cliente
            </label>
            <input
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              placeholder="Nombre o identificación (mín. 2)"
              className={inp}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Operación
            </label>
            <div className="relative">
              <select
                value={tipoOperacion}
                onChange={(e) => setTipoOperacion(e.target.value as TipoOperacion)}
                className={sel}
              >
                <option value="venta">Venta</option>
                <option value="cambio">Cambio</option>
                <option value="devolucion">Devolución</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Tipo ID
            </label>
            <div className="relative">
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value as DocTipo)}
                className={sel}
              >
                <option value="NIT">NIT</option>
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="OTRO">Otro</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Motivo CYD
            </label>
            <input
              value={motivoCyd}
              onChange={(e) => setMotivoCyd(e.target.value)}
              placeholder="Opcional"
              disabled={tipoOperacion === 'venta'}
              className={`${inp} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Medio de pago</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={metodoPago === 'transferencia_qr' ? 'primary' : 'secondary'}
              onClick={() => setMetodoPago('transferencia_qr')}
            >
              ▦ QR Transferencia
            </Button>
            <Button variant={metodoPago === 'efectivo' ? 'primary' : 'secondary'} onClick={() => setMetodoPago('efectivo')}>
              $ Efectivo
            </Button>
            <Button variant={metodoPago === 'tarjeta' ? 'primary' : 'secondary'} onClick={() => setMetodoPago('tarjeta')}>
              💳 Tarjeta
            </Button>
            <Button variant={metodoPago === 'cyd' ? 'primary' : 'secondary'} onClick={() => setMetodoPago('cyd')}>
              CYD
            </Button>
          </div>
        </div>

        {clienteSearch.trim().length >= 2 && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            {loadingClientes && <p className="text-xs text-slate-500">Buscando clientes...</p>}
            {!loadingClientes && clientes.length === 0 && (
              <p className="text-xs text-slate-500">Sin resultados para esa búsqueda.</p>
            )}
            {!loadingClientes && clientes.length > 0 && (
              <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                {clientes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClienteId(c.id)
                      setClienteLabel(`${c.nombre}${c.documento ? ` (${c.documento})` : ''}`)
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary-300 hover:bg-primary-50"
                  >
                    <span className="block">{c.nombre}</span>
                    {c.documento ? <span className="text-slate-500">ID {c.documento}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Cliente: {clienteLabel}
          </span>
          {ventaOrigen ? (
            <Button size="sm" variant="secondary" onClick={() => cargarItemsVentaOrigen(ventaOrigen)}>
              Cargar venta #{ventaOrigen.id}
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <Card
          title="Productos"
          clip={false}
          className="flex min-h-[min(560px,calc(100vh-15rem))] flex-col"
          contentClassName="flex min-h-0 flex-1 flex-col p-4"
        >
          {loadingProductos && <p className="text-sm text-slate-500">Cargando productos...</p>}
          {!loadingProductos && (
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5">Producto</th>
                    <th className="px-2 py-2.5">Precio</th>
                    <th className="px-2 py-2.5">Stock</th>
                    <th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productosFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-primary-50/40">
                      <td className="px-3 py-2">
                        <div className="line-clamp-1 font-medium text-slate-800">{p.nombre}</div>
                        <div className="text-xs text-slate-500">{p.presentacion ?? '—'}</div>
                      </td>
                      <td className="px-2 py-2 tabular-nums text-slate-700">{toPrice(p.precio).toFixed(2)}</td>
                      <td className="px-2 py-2 tabular-nums text-slate-600">{p.stock_actual}</td>
                      <td className="px-2 py-2 text-right">
                        <Button
                          size="sm"
                          onClick={() => addToCart(p)}
                          disabled={tipoOperacion !== 'devolucion' && p.stock_actual <= 0}
                        >
                          +
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Detalle de venta"
          clip={false}
          className="flex min-h-[min(560px,calc(100vh-15rem))] flex-col"
          contentClassName="flex min-h-0 flex-1 flex-col p-4"
        >
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
            {error && (
              <Alert variant="error" onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-100">
              {cart.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Aún no has agregado productos.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2.5">Item</th>
                      <th className="px-2 py-2.5">Cant</th>
                      <th className="px-2 py-2.5">P.U.</th>
                      <th className="px-2 py-2.5">Sub</th>
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((it) => (
                      <tr key={it.producto_id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2">
                          <div className="line-clamp-1 font-medium text-slate-800">{it.nombre}</div>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            max={tipoOperacion === 'devolucion' ? 999999 : it.stock_actual}
                            value={it.cantidad}
                            onChange={(e) => updateQty(it.producto_id, parseInt(e.target.value, 10) || 0)}
                            className="w-[4.25rem] rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 text-xs tabular-nums shadow-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200/70"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.precio_unitario}
                            onChange={(e) =>
                              setCart((prev) =>
                                prev.map((row) =>
                                  row.producto_id === it.producto_id
                                    ? { ...row, precio_unitario: Math.max(0, Number(e.target.value) || 0) }
                                    : row
                                )
                              )
                            }
                            className="w-[5.25rem] rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 text-xs tabular-nums shadow-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200/70"
                          />
                        </td>
                        <td className="px-2 py-2 tabular-nums text-slate-700">
                          {(it.cantidad * it.precio_unitario).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button size="sm" variant="ghost" onClick={() => removeItem(it.producto_id)}>
                            ×
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="shrink-0 space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Items: {itemsValidos.length}</span>
                <span className="text-xl font-bold tabular-nums text-slate-900">Total: {total.toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pb-1">
                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  disabled={itemsValidos.length === 0 || hasSinStock}
                  className="min-h-[44px] min-w-[160px]"
                >
                  Cobrar y registrar
                </Button>
                <Button type="button" variant="secondary" onClick={() => setCart([])} disabled={cart.length === 0}>
                  Limpiar
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
