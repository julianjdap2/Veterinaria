import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useClientes } from './hooks/useClientes'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { IconEye } from '../../shared/ui/icons'
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '../../shared/ui/Table'
import { ApiError } from '../../api/errors'
import type { Cliente } from '../../api/types'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

function formatListDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function celularDisplay(c: Cliente): string {
  const v = (c.celular || c.telefono || '').trim()
  return v || '—'
}

function tipoIdentDisplay(c: Cliente): string {
  const t = (c.tipo_documento || '').trim()
  if (t) return t
  if ((c.documento || '').trim()) return 'CC'
  return '—'
}

/** Contacto y tipo en una celda (menos columnas = menos scroll horizontal). */
function contactoDisplay(c: Cliente): { text: string; title: string } {
  const ct = (c.contacto || '').trim()
  const tt = (c.tipo_contacto || '').trim()
  if (!ct && !tt) return { text: '—', title: '' }
  const text = ct && tt ? `${ct} · ${tt}` : ct || tt
  const title = [ct, tt].filter(Boolean).join(' — ')
  return { text, title }
}

function buildPageWindow(current: number, totalPages: number): number[] {
  if (totalPages <= 0) return []
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages = new Set<number>()
  pages.add(1)
  pages.add(totalPages)
  for (let d = -2; d <= 2; d++) {
    const n = current + d
    if (n >= 1 && n <= totalPages) pages.add(n)
  }
  return [...pages].sort((a, b) => a - b)
}

/**
 * Administración → Propietarios: listado estilo gestión clínica (tabla densa, paginación tipo DataTables).
 * El ojo abre el consultorio con `?cliente_id=`.
 */
export function PropietariosListPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [busqueda, setBusqueda] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)

  const filters = useMemo(
    () => ({
      page,
      page_size: pageSize,
      busqueda: busqueda.trim() || undefined,
      incluir_inactivos: incluirInactivos,
    }),
    [page, pageSize, busqueda, incluirInactivos],
  )

  const { data, isLoading, isError, error: queryError } = useClientes(filters)

  const showError = isError && queryError instanceof ApiError ? queryError.message : null

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1
  const pageButtons = useMemo(() => buildPageWindow(page, totalPages), [page, totalPages])

  const from =
    !data || data.total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = !data || data.total === 0 ? 0 : Math.min(page * pageSize, data.total)

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Inicio', to: '/dashboard' }, { label: 'Administración' }, { label: 'Propietarios' }]}
        title="Gestión de propietarios"
        actions={
          <Link to="/clientes/nuevo">
            <Button>Registrar propietario</Button>
          </Link>
        }
      />

      <section className="overflow-hidden rounded-xl border border-emerald-100/60 bg-white shadow-sm ring-1 ring-emerald-50/40">
        <div className="border-b border-emerald-100/50 bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/30 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Propietarios registrados</h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-800">
            <label className="flex cursor-pointer items-center gap-2">
              <span>Mostrar</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>registros</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={incluirInactivos}
                onChange={(e) => {
                  setIncluirInactivos(e.target.checked)
                  setPage(1)
                }}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              Incluir inactivos
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
            <span className="font-medium">Buscar:</span>
            <Input
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPage(1)
              }}
              placeholder=""
              className="w-56 min-w-[8rem] sm:w-72"
              aria-label="Buscar propietarios"
            />
          </div>
        </div>

        {showError && (
          <div className="px-4 pt-3">
            <Alert variant="error">{showError}</Alert>
          </div>
        )}

        {isLoading && <p className="px-4 py-6 text-sm text-slate-500">Cargando…</p>}

        {data && (
          <>
            <div className="min-w-0 overflow-hidden">
              <Table
                plain
                className="w-full table-fixed text-[11px] leading-snug sm:text-xs [&_td]:border [&_td]:border-slate-200 [&_th]:border [&_th]:border-slate-200"
              >
                <colgroup>
                  <col style={{ width: '3%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '4%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <TableHead>
                  <TableRow header>
                    {[
                      'Opciones',
                      'Nombres',
                      'TIdent',
                      'Ident.',
                      'Correo',
                      'Celular',
                      'Teléfono',
                      'Dirección',
                      'Contacto / tipo',
                      'Masc.',
                      'Actualizado',
                      'Autorización',
                    ].map((h) => (
                      <TableTh
                        key={h}
                        className="!px-1 !py-1.5 text-center text-[10px] normal-case sm:!text-[11px]"
                      >
                        {h}
                      </TableTh>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y-0">
                  {data.items.length === 0 ? (
                    <TableRow className="!bg-transparent hover:!bg-transparent even:!bg-transparent">
                      <TableTd colSpan={12} className="!px-4 !py-8 text-center text-slate-500">
                        No hay propietarios con los filtros actuales.
                      </TableTd>
                    </TableRow>
                  ) : (
                    data.items.map((c) => {
                      const cont = contactoDisplay(c)
                      const cel = celularDisplay(c)
                      return (
                        <TableRow
                          key={c.id}
                          className={`${!c.activo ? '!bg-slate-50 even:!bg-slate-50' : ''} hover:!bg-emerald-50/50`}
                        >
                          <TableTd className="!p-0 text-center">
                            <Link
                              to={`/consultorio?cliente_id=${c.id}`}
                              className="inline-flex h-7 w-full min-w-0 max-w-[2rem] items-center justify-center text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-900 sm:h-8"
                              title="Ver en consultorio"
                              aria-label={`Ver ${c.nombre} en consultorio`}
                            >
                              <IconEye className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Link>
                          </TableTd>
                          <TableTd
                            className="!px-1 !py-1 max-w-0 truncate text-center font-medium text-slate-900"
                            title={c.nombre}
                          >
                            {c.nombre}
                          </TableTd>
                          <TableTd className="!px-1 !py-1 max-w-0 truncate text-center text-slate-800">
                            {tipoIdentDisplay(c)}
                          </TableTd>
                          <TableTd
                            className="!px-1 !py-1 max-w-0 truncate text-center font-mono text-slate-800"
                            title={c.documento ?? undefined}
                          >
                            {c.documento ?? '—'}
                          </TableTd>
                          <TableTd
                            className="!px-1 !py-1 max-w-0 truncate text-center text-slate-700"
                            title={c.email?.trim() || undefined}
                          >
                            {c.email?.trim() ? c.email : '—'}
                          </TableTd>
                          <TableTd
                            className="!px-1 !py-1 max-w-0 truncate text-center text-slate-800"
                            title={cel !== '—' ? cel : undefined}
                          >
                            {cel}
                          </TableTd>
                          <TableTd
                            className="!px-1 !py-1 max-w-0 truncate text-center text-slate-800"
                            title={(c.telefono_fijo || '').trim() || undefined}
                          >
                            {(c.telefono_fijo || '').trim() || '—'}
                          </TableTd>
                          <TableTd
                            className="!px-1 !py-1 max-w-0 truncate text-center text-slate-700"
                            title={c.direccion ?? undefined}
                          >
                            {c.direccion ?? '—'}
                          </TableTd>
                          <TableTd
                            className="!px-1 !py-1 max-w-0 truncate text-center text-slate-800"
                            title={cont.title || undefined}
                          >
                            {cont.text}
                          </TableTd>
                          <TableTd className="!px-1 !py-1 text-center tabular-nums text-slate-800">
                            {c.mascotas_count != null ? c.mascotas_count : '—'}
                          </TableTd>
                          <TableTd className="!px-1 !py-1 max-w-0 whitespace-nowrap text-center text-[10px] text-slate-700 sm:text-[11px]">
                            {formatListDateTime(c.updated_at)}
                          </TableTd>
                          <TableTd className="!px-1 !py-1 max-w-0 whitespace-nowrap text-center text-[10px] text-slate-700 sm:text-[11px]">
                            {formatListDateTime(c.autorizacion_at)}
                          </TableTd>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100/50 px-4 py-3 text-sm text-slate-700">
              <p>
                Mostrando registros del <span className="font-medium text-slate-900">{from}</span> al{' '}
                <span className="font-medium text-slate-900">{to}</span> de un total de{' '}
                <span className="font-medium text-slate-900">{data.total}</span> registros
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                {pageButtons.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-[2.25rem] rounded border px-2.5 py-1.5 text-sm font-medium transition ${
                      n === page
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-emerald-50/60'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
