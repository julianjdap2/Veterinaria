import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useVentas } from './hooks/useVentas'
import { formatVentaFecha } from './formatVentaFecha'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { VentaDetailModal } from './VentaDetailModal'

export function VentasListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [cydOpen, setCydOpen] = useState(false)
  const [cydVentaId, setCydVentaId] = useState<number | null>(null)
  const [cydTipo, setCydTipo] = useState<'cambio' | 'devolucion'>('cambio')
  const [cydMotivo, setCydMotivo] = useState('')
  const { data, isLoading } = useVentas({ page, page_size: 20 })
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = data?.page_size ?? 20

  function openCyd(ventaId: number) {
    setCydVentaId(ventaId)
    setCydTipo('cambio')
    setCydMotivo('')
    setCydOpen(true)
  }

  function confirmCyd() {
    if (cydVentaId == null) return
    navigate('/ventas/pos', {
      state: {
        ventaOrigenId: cydVentaId,
        tipoOperacion: cydTipo,
        motivo_cyd: cydMotivo.trim() || null,
      },
    })
    setCydOpen(false)
  }

  return (
    <div className="space-y-6">
      {detailId != null && <VentaDetailModal ventaId={detailId} onClose={() => setDetailId(null)} />}

      {cydOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-card-hover">
            <h2 className="text-lg font-bold text-slate-900">Cambio / devolución</h2>
            <p className="mt-1 text-sm text-slate-600">
              Elige el tipo de operación. Se abrirá el POS con la venta origen vinculada.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="cydtipo"
                    checked={cydTipo === 'cambio'}
                    onChange={() => setCydTipo('cambio')}
                  />
                  Cambio
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="cydtipo"
                    checked={cydTipo === 'devolucion'}
                    onChange={() => setCydTipo('devolucion')}
                  />
                  Devolución
                </label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Motivo (opcional)</label>
                <textarea
                  value={cydMotivo}
                  onChange={(e) => setCydMotivo(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej. producto defectuoso, cambio de presentación..."
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCydOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirmCyd}>
                Continuar en POS
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <div className="flex gap-2">
          <Link to="/ventas/pos">
            <Button>POS rapido</Button>
          </Link>
          <Link to="/ventas/nueva">
            <Button variant="secondary">Venta por consulta</Button>
          </Link>
        </div>
      </div>

      <Card title="Historial de ventas" clip={false} contentClassName="p-0 sm:p-1">
        {isLoading && <p className="p-5 text-sm text-slate-500">Cargando...</p>}
        {!isLoading && items.length === 0 && (
          <p className="p-5 text-sm text-slate-500">No hay ventas registradas.</p>
        )}
        {!isLoading && items.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nº interno</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3">Consulta</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((v) => (
                  <tr key={v.id} className="transition hover:bg-primary-50/30">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {v.codigo_interno ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{formatVentaFecha(v.fecha)}</td>
                    <td className="px-4 py-3 tabular-nums font-medium text-slate-900">
                      {v.total != null ? Number(v.total).toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          (v.tipo_operacion ?? 'venta') === 'venta'
                            ? 'bg-emerald-100 text-emerald-800'
                            : (v.tipo_operacion ?? '') === 'devolucion'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {v.tipo_operacion ?? 'venta'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {v.metodo_pago ?? 'efectivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {v.consulta_id != null ? (
                        <Link
                          to={`/consultas/${v.consulta_id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          Ver consulta
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1 sm:gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 min-w-0 px-2 text-xs text-primary-700"
                          title="Ver detalle"
                          onClick={() => setDetailId(v.id)}
                        >
                          👁 Detalle
                        </Button>
                        <Link to={`/ventas/${v.id}`} state={{ from: '/ventas' }}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 min-w-0 px-2 text-xs"
                            title="Página completa"
                          >
                            📄
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 min-w-0 px-2 text-xs text-amber-800"
                          title="Cambio o devolución"
                          onClick={() => openCyd(v.id)}
                        >
                          ⇄ CYD
                        </Button>
                      </div>
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
