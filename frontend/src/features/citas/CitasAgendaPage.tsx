import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useCitasAgenda } from './hooks/useCitasAgenda'
import { useMascotas } from '../mascotas/hooks/useMascotas'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { Pagination } from '../../shared/ui/Pagination'
import { DEFAULT_PAGE_SIZE } from '../../core/constants'

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'atendida', label: 'Atendida' },
  { value: 'cancelada', label: 'Cancelada' },
] as const

function formatDateTime(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return s
  }
}

export function CitasAgendaPage() {
  const user = useAuthStore((s) => s.user)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [estado, setEstado] = useState('')
  const [misCitas, setMisCitas] = useState(false)

  const isVet = user?.rolId === ROLES.VETERINARIO
  const filters = {
    page,
    page_size: pageSize,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
    estado: estado || undefined,
    veterinario_id: isVet && misCitas && user?.userId ? user.userId : undefined,
  }
  const { data, isLoading, isError, error } = useCitasAgenda(filters)
  const { data: mascotasData } = useMascotas({ page: 1, page_size: 500 })
  const mascotasMap = new Map((mascotasData?.items ?? []).map((m) => [m.id, m.nombre]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agenda de citas</h1>
        <Link to="/citas/nuevo">
          <Button>Nueva cita</Button>
        </Link>
      </div>

      <Card title="Citas">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <Input
              type="date"
              label="Desde"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value)
                setPage(1)
              }}
              className="max-w-[160px]"
            />
            <Input
              type="date"
              label="Hasta"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value)
                setPage(1)
              }}
              className="max-w-[160px]"
            />
            {isVet && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={misCitas}
                  onChange={(e) => {
                    setMisCitas(e.target.checked)
                    setPage(1)
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Mis citas
              </label>
            )}
            <div className="min-w-[140px]">
              <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
              <select
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ESTADOS.map((e) => (
                  <option key={e.value || 'all'} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isError && (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Error al cargar citas'}
            </p>
          )}
          {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}
          {data && (
            <>
              <Table>
                <TableHead>
                    <TableRow>
                    <TableTh>Fecha</TableTh>
                    <TableTh>Mascota</TableTh>
                    <TableTh>Asignada a</TableTh>
                    <TableTh>Motivo</TableTh>
                    <TableTh>Estado</TableTh>
                    <TableTh className="text-right">Acción</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableTd className="text-sm whitespace-nowrap">
                        {formatDateTime(c.fecha)}
                      </TableTd>
                      <TableTd>
                        <Link
                          to={`/mascotas/${c.mascota_id}`}
                          className="text-primary-600 hover:underline"
                        >
                          {mascotasMap.get(c.mascota_id) ?? `#${c.mascota_id}`}
                        </Link>
                      </TableTd>
                      <TableTd className="text-sm text-gray-600">
                        {c.veterinario_id != null ? `Vet #${c.veterinario_id}` : '—'}
                      </TableTd>
                      <TableTd className="max-w-[200px] truncate">
                        {c.motivo ?? '—'}
                      </TableTd>
                      <TableTd>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            c.estado === 'atendida'
                              ? 'bg-emerald-200 text-emerald-900 ring-1 ring-emerald-300'
                              : c.estado === 'cancelada'
                                ? 'bg-red-200 text-red-900 ring-1 ring-red-300'
                                : c.estado === 'confirmada'
                                  ? 'bg-sky-200 text-sky-900 ring-1 ring-sky-300'
                                  : 'bg-slate-200 text-slate-900 ring-1 ring-slate-300'
                          }`}
                        >
                          {c.estado ?? 'pendiente'}
                        </span>
                      </TableTd>
                      <TableTd className="text-right">
                        <Link to={`/citas/${c.id}`}>
                          <Button variant="ghost">Ver / Editar</Button>
                        </Link>
                      </TableTd>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={data.page}
                pageSize={data.page_size}
                total={data.total}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
