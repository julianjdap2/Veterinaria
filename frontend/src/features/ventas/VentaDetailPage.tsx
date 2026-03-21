import { Link, useParams, useLocation } from 'react-router-dom'
import { useVentaDetail } from './hooks/useVentas'
import { formatVentaFecha } from './formatVentaFecha'
import { Card } from '../../shared/ui/Card'

export function VentaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const ventaId = id ? parseInt(id, 10) : null
  const { data: venta, isLoading, isError } = useVentaDetail(ventaId)
  const backTo = (location.state as { from?: string } | null)?.from ?? '/ventas'

  if (ventaId == null || isError || (!isLoading && !venta)) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Venta no encontrada.</p>
        <Link to={backTo} className="text-primary-600 hover:underline text-sm">
          ← Volver
        </Link>
      </div>
    )
  }

  if (isLoading || !venta) {
    return <p className="text-gray-500">Cargando...</p>
  }

  return (
    <div className="space-y-6">
      <Link to={backTo} className="text-primary-600 hover:underline text-sm">
        ← Volver
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">
        {venta.codigo_interno ?? 'Venta'}
      </h1>
      <div className="flex gap-2">
        <Link
          to="/ventas/pos"
          state={{ ventaOrigenId: venta.id, tipoOperacion: 'cambio' }}
          className="text-amber-700 hover:underline text-sm"
        >
          Iniciar cambio (CYD)
        </Link>
        <Link
          to="/ventas/pos"
          state={{ ventaOrigenId: venta.id, tipoOperacion: 'devolucion' }}
          className="text-red-700 hover:underline text-sm"
        >
          Iniciar devolucion (CYD)
        </Link>
      </div>
      <Card title="Detalle">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Fecha</dt>
            <dd>{formatVentaFecha(venta.fecha)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Total</dt>
            <dd className="font-medium">{venta.total != null ? Number(venta.total).toFixed(2) : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tipo</dt>
            <dd>{venta.tipo_operacion ?? 'venta'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Metodo pago</dt>
            <dd>{venta.metodo_pago ?? 'efectivo'}</dd>
          </div>
          {venta.consulta_id != null && (
            <div>
              <dt className="text-gray-500">Consulta</dt>
              <dd>
                <Link to={`/consultas/${venta.consulta_id}`} className="text-primary-600 hover:underline">
                  Ver consulta #{venta.consulta_id}
                </Link>
              </dd>
            </div>
          )}
        </dl>
        <h3 className="mt-4 font-medium text-slate-700">Items</h3>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-600">
              <th className="pb-1 pr-4">Producto ID</th>
              <th className="pb-1 pr-4">Cantidad</th>
              <th className="pb-1 pr-4">P. unit.</th>
              <th className="pb-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(venta.items ?? []).map((it) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-1 pr-4">{it.producto_id}</td>
                <td className="py-1 pr-4">{it.cantidad}</td>
                <td className="py-1 pr-4">{Number(it.precio_unitario).toFixed(2)}</td>
                <td className="py-1">{((it.cantidad || 0) * Number(it.precio_unitario)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
