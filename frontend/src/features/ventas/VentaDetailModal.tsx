import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchVentaDetalleAmpliado } from './api'
import { formatVentaFecha } from './formatVentaFecha'
import { Button } from '../../shared/ui/Button'

export function VentaDetailModal({
  ventaId,
  onClose,
}: {
  ventaId: number
  onClose: () => void
}) {
  const { data: v, isLoading, isError } = useQuery({
    queryKey: ['ventas', 'ampliado', ventaId],
    queryFn: () => fetchVentaDetalleAmpliado(ventaId),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="venta-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-card-hover">
        <div className="flex items-start justify-between gap-3">
          <h2 id="venta-modal-title" className="text-lg font-bold text-slate-900">
            {isLoading ? 'Cargando…' : v?.codigo_interno ?? 'Venta'}
          </h2>
          <Button type="button" variant="ghost" className="shrink-0" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        {isLoading && <p className="mt-4 text-sm text-slate-500">Cargando...</p>}
        {isError && <p className="mt-4 text-sm text-red-600">No se pudo cargar el detalle.</p>}

        {v && (
          <dl className="mt-4 grid grid-cols-1 gap-2 text-sm">
            <div>
              <dt className="text-slate-500">Fecha</dt>
              <dd>{formatVentaFecha(v.fecha)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Total</dt>
              <dd className="font-semibold">{v.total != null ? Number(v.total).toFixed(2) : '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tipo</dt>
              <dd>{v.tipo_operacion ?? 'venta'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Pago</dt>
              <dd>{v.metodo_pago ?? 'efectivo'}</dd>
            </div>
            {v.cliente_nombre ? (
              <div>
                <dt className="text-slate-500">Cliente</dt>
                <dd>
                  {v.cliente_nombre}
                  {v.cliente_documento ? (
                    <span className="text-slate-500"> · {v.cliente_documento}</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            {v.mascota_nombre ? (
              <div>
                <dt className="text-slate-500">Mascota</dt>
                <dd>{v.mascota_nombre}</dd>
              </div>
            ) : null}
            {v.consulta_id != null ? (
              <div>
                <dt className="text-slate-500">Consulta</dt>
                <dd>
                  <Link to={`/consultas/${v.consulta_id}`} className="text-primary-600 hover:underline">
                    Ver consulta #{v.consulta_id}
                  </Link>
                </dd>
              </div>
            ) : null}
            {v.motivo_cyd ? (
              <div>
                <dt className="text-slate-500">Motivo CYD</dt>
                <dd className="text-slate-700">{v.motivo_cyd}</dd>
              </div>
            ) : null}
          </dl>
        )}

        {v && v.items?.length ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-800">Ítems</h3>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {v.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-2 py-2">
                  <span className="min-w-0 truncate">
                    {it.producto_nombre ?? `Producto #${it.producto_id}`}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-600">
                    {it.cantidad} × {Number(it.precio_unitario).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {v && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Link to={`/ventas/${v.id}`} state={{ from: '/ventas' }} onClick={onClose}>
              <Button variant="secondary" type="button">
                Abrir página completa
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
