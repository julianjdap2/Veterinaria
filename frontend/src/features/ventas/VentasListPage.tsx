import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useVentas } from './hooks/useVentas'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'

function formatDate(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return s
  }
}

export function VentasListPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useVentas({ page, page_size: 20 })
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = data?.page_size ?? 20

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <Link to="/ventas/nueva">
          <Button>Nueva venta</Button>
        </Link>
      </div>

      <Card title="Historial de ventas">
        {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-gray-500">No hay ventas registradas.</p>
        )}
        {!isLoading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Consulta</th>
                  <th className="pb-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium">#{v.id}</td>
                    <td className="py-2 pr-4">{formatDate(v.fecha)}</td>
                    <td className="py-2 pr-4">{v.total != null ? Number(v.total).toFixed(2) : '—'}</td>
                    <td className="py-2 pr-4">
                      {v.consulta_id != null ? (
                        <Link to={`/consultas/${v.consulta_id}`} className="text-primary-600 hover:underline">
                          Ver consulta
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <Link to={`/ventas/${v.id}`} className="text-primary-600 hover:underline text-xs">
                        Detalle
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
