import { Link, useParams, useLocation } from 'react-router-dom'
import { useVentaDetail } from './hooks/useVentas'
import { formatVentaFecha } from './formatVentaFecha'
import { Card } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '../../shared/ui/Table'

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
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Ventas', to: '/ventas' }, { label: venta.codigo_interno ?? `Venta #${venta.id}` }]}
        title={venta.codigo_interno ?? 'Venta'}
        subtitle="Detalle interno y enlaces a cambio o devolución."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link to={backTo} className="text-sm font-medium text-primary-600 hover:text-primary-800">
              ← Volver
            </Link>
            <Link
              to="/ventas/pos"
              state={{ ventaOrigenId: venta.id, tipoOperacion: 'cambio' }}
              className="text-sm font-medium text-amber-800 hover:underline"
            >
              Cambio (CYD)
            </Link>
            <Link
              to="/ventas/pos"
              state={{ ventaOrigenId: venta.id, tipoOperacion: 'devolucion' }}
              className="text-sm font-medium text-red-700 hover:underline"
            >
              Devolución (CYD)
            </Link>
          </div>
        }
      />
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
        <div className="mt-2">
          <Table plain className="w-full text-sm">
            <TableHead>
              <TableRow header>
                <TableTh className="!pb-1 !pr-4">Producto ID</TableTh>
                <TableTh className="!pb-1 !pr-4">Cantidad</TableTh>
                <TableTh className="!pb-1 !pr-4">P. unit.</TableTh>
                <TableTh className="!pb-1">Subtotal</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {(venta.items ?? []).map((it) => (
                <TableRow key={it.id}>
                  <TableTd className="!py-1 !pr-4">{it.producto_id}</TableTd>
                  <TableTd className="!py-1 !pr-4">{it.cantidad}</TableTd>
                  <TableTd className="!py-1 !pr-4">{Number(it.precio_unitario).toFixed(2)}</TableTd>
                  <TableTd className="!py-1">
                    {((it.cantidad || 0) * Number(it.precio_unitario)).toFixed(2)}
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
