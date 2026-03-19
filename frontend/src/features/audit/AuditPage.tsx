import { useState, useEffect } from 'react'
import { useAuditLogs } from './hooks/useAuditLogs'
import { toast } from '../../core/toast-store'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { Pagination } from '../../shared/ui/Pagination'

const PAGE_SIZE = 50

function formatDate(s: string | null): string {
  if (!s) return '—'
  try {
    const d = new Date(s)
    return d.toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return s
  }
}

export function AuditPage() {
  const [page, setPage] = useState(1)
  const [tabla, setTabla] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const filters = {
    page,
    page_size: PAGE_SIZE,
    tabla: tabla.trim() || undefined,
    usuario_id: usuarioId.trim() ? Number(usuarioId) : undefined,
    fecha_desde: fechaDesde ? new Date(fechaDesde).toISOString() : undefined,
    fecha_hasta: fechaHasta ? new Date(fechaHasta).toISOString() : undefined,
  }

  const { data, isLoading, isError } = useAuditLogs(filters)

  useEffect(() => {
    if (isError) toast.error('No se pudo cargar la auditoría. Solo administradores pueden acceder.')
  }, [isError])

  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>

      <Card title="Filtros">
        <div className="flex flex-wrap items-end gap-4">
          <Input
            label="Tabla"
            placeholder="ej. clientes, mascotas"
            value={tabla}
            onChange={(e) => {
              setTabla(e.target.value)
              setPage(1)
            }}
            className="max-w-[180px]"
          />
          <Input
            label="Usuario ID"
            type="number"
            placeholder="ID"
            value={usuarioId}
            onChange={(e) => {
              setUsuarioId(e.target.value)
              setPage(1)
            }}
            className="max-w-[120px]"
          />
          <Input
            label="Desde"
            type="datetime-local"
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value)
              setPage(1)
            }}
            className="max-w-[200px]"
          />
          <Input
            label="Hasta"
            type="datetime-local"
            value={fechaHasta}
            onChange={(e) => {
              setFechaHasta(e.target.value)
              setPage(1)
            }}
            className="max-w-[200px]"
          />
          <Button
            variant="secondary"
            onClick={() => {
              setTabla('')
              setUsuarioId('')
              setFechaDesde('')
              setFechaHasta('')
              setPage(1)
            }}
          >
            Limpiar
          </Button>
        </div>
      </Card>

      <Card title="Registros">
        {isError ? (
          <p className="text-red-600">No se pudo cargar la auditoría. Solo administradores pueden acceder.</p>
        ) : isLoading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableTh>ID</TableTh>
                    <TableTh>Fecha</TableTh>
                    <TableTh>Usuario ID</TableTh>
                    <TableTh>Acción</TableTh>
                    <TableTh>Tabla</TableTh>
                    <TableTh>Registro ID</TableTh>
                    <TableTh>Descripción</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <td colSpan={7} className="px-4 py-3 text-center text-sm text-gray-500">
                        No hay registros con los filtros aplicados.
                      </td>
                    </TableRow>
                  ) : (
                    items.map((log) => (
                      <TableRow key={log.id}>
                        <TableTd>{log.id}</TableTd>
                        <TableTd>{formatDate(log.created_at)}</TableTd>
                        <TableTd>{log.usuario_id ?? '—'}</TableTd>
                        <TableTd>{log.accion}</TableTd>
                        <TableTd>{log.tabla_afectada ?? '—'}</TableTd>
                        <TableTd>{log.registro_id ?? '—'}</TableTd>
                        <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900" title={log.descripcion ?? undefined}>
                          {log.descripcion ?? '—'}
                        </td>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {total > 0 && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
