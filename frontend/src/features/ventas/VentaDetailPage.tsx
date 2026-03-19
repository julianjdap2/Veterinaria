import { Link, useParams } from 'react-router-dom'
import { useVentaDetail } from './hooks/useVentas'
import { Card } from '../../shared/ui/Card'

function formatDate(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return s
  }
}

export function VentaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ventaId = id ? parseInt(id, 10) : null
  const { data: venta, isLoading, isError } = useVentaDetail(ventaId)

  if (ventaId == null || isError || (!isLoading && !venta)) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Venta no encontrada.</p>
        <Link to="/ventas" className="text-primary-600 hover:underline text-sm">
          ← Volver a ventas
        </Link>
      </div>
    )
  }

  if (isLoading || !venta) {
    return <p className="text-gray-500">Cargando...</p>
  }

  return (
    <div className="space-y-6">
      <Link to="/ventas" className="text-primary-600 hover:underline text-sm">
        ← Volver a ventas
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Venta #{venta.id}</h1>
      <Card title="Detalle">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Fecha</dt>
            <dd>{formatDate(venta.fecha)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Total</dt>
            <dd className="font-medium">{venta.total != null ? Number(venta.total).toFixed(2) : '—'}</dd>
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
