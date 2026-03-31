import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useVentas } from './hooks/useVentas'
import { formatVentaFecha } from './formatVentaFecha'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { DataListPanel } from '../../shared/ui/DataListPanel'
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
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
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
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

      <PageHeader
        breadcrumbs={[{ label: 'Inicio', to: '/dashboard' }, { label: 'Ventas' }]}
        title="Ventas"
        subtitle="Historial interno, POS rápido y ventas ligadas a consulta."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/ventas/pos">
              <Button>POS rápido</Button>
            </Link>
            <Link to="/ventas/nueva">
              <Button variant="secondary">Venta por consulta</Button>
            </Link>
          </div>
        }
      />

      <DataListPanel
        kicker="Historial"
        title="Ventas registradas"
        description="Desde aquí abres detalle, página completa o cambio/devolución (CYD)."
        flush
      >
        {isLoading && <p className="p-5 text-sm text-slate-500">Cargando...</p>}
        {!isLoading && items.length === 0 && (
          <p className="p-5 text-sm text-slate-500">No hay ventas registradas.</p>
        )}
        {!isLoading && items.length > 0 && (
          <div className="border-t border-slate-100 md:rounded-b-xl">
            <Table plain className="min-w-[720px]">
              <TableHead>
                <TableRow header>
                  <TableTh>Nº interno</TableTh>
                  <TableTh>Fecha</TableTh>
                  <TableTh>Total</TableTh>
                  <TableTh>Tipo</TableTh>
                  <TableTh>Pago</TableTh>
                  <TableTh>Consulta</TableTh>
                  <TableTh className="text-right">Acciones</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((v) => (
                  <TableRow key={v.id}>
                    <TableTd className="font-medium text-slate-900">{v.codigo_interno ?? '—'}</TableTd>
                    <TableTd className="tabular-nums text-slate-700">{formatVentaFecha(v.fecha)}</TableTd>
                    <TableTd className="tabular-nums font-semibold text-slate-900">
                      {v.total != null ? Number(v.total).toFixed(2) : '—'}
                    </TableTd>
                    <TableTd>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                          (v.tipo_operacion ?? 'venta') === 'venta'
                            ? 'bg-emerald-100 text-emerald-800 ring-emerald-300/80'
                            : (v.tipo_operacion ?? '') === 'devolucion'
                              ? 'bg-red-100 text-red-800 ring-red-300/80'
                              : 'bg-amber-100 text-amber-900 ring-amber-300/80'
                        }`}
                      >
                        {v.tipo_operacion ?? 'venta'}
                      </span>
                    </TableTd>
                    <TableTd>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80">
                        {v.metodo_pago ?? 'efectivo'}
                      </span>
                    </TableTd>
                    <TableTd>
                      {v.consulta_id != null ? (
                        <Link
                          to={`/consultas/${v.consulta_id}`}
                          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          Ver consulta
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableTd>
                    <TableTd className="text-right">
                      <div className="flex flex-wrap justify-end gap-1 sm:gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 min-w-0 px-2 text-xs text-emerald-800"
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
                    </TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {total > pageSize && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 text-sm">
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
