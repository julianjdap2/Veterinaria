import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../../core/auth-store'
import { DASHBOARD_MODAL_PAGE_SIZE, ROLES } from '../../core/constants'
import { useMisPermisosAdmin } from '../usuarios/hooks/useUsuarios'
import { Card } from '../../shared/ui/Card'
import { fetchDashboardNotificaciones, fetchDashboardResumen } from './api'
import { Modal } from '../../shared/ui/Modal'
import { fetchCitasAgenda } from '../citas/api'
import { fetchVentas } from '../ventas/api'

function formatDateTime(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return s
  }
}

function kpiColor(label: string): string {
  if (label.includes('Canceladas')) return 'text-red-700'
  if (label.includes('Urgentes')) return 'text-amber-700'
  if (label.includes('Atendidas')) return 'text-emerald-700'
  return 'text-slate-800'
}

export function DashboardPage() {
  const authUser = useAuthStore((s) => s.user)
  const isTenantAdmin = authUser?.rolId === ROLES.ADMIN
  const { data: permisosAdmin } = useMisPermisosAdmin({ enabled: isTenantAdmin })
  const canExportDashboard =
    !isTenantAdmin || permisosAdmin?.admin_exportacion_dashboard === true

  const [dias, setDias] = useState<number>(1)
  const [activeTab, setActiveTab] = useState<'resumen' | 'consultas' | 'ventas' | 'personalizados'>('resumen')
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [modalSearch, setModalSearch] = useState('')
  const [csvColumns, setCsvColumns] = useState<Record<string, boolean>>({})
  const [openAddBoard, setOpenAddBoard] = useState(false)
  const [customBoards, setCustomBoards] = useState<Array<{ id: string; title: string; value: string | number }>>([])
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'resumen', dias],
    queryFn: () => fetchDashboardResumen(dias),
  })

  const modalRange = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (dias - 1))
    start.setHours(0, 0, 0, 0)
    return { startIso: start.toISOString(), endIso: end.toISOString() }
  }, [dias])

  const { data: modalCitas } = useQuery({
    queryKey: ['dashboard', 'modal', 'citas', dias],
    queryFn: () =>
      fetchCitasAgenda({
        page: 1,
        page_size: DASHBOARD_MODAL_PAGE_SIZE,
        fecha_desde: modalRange.startIso,
        fecha_hasta: modalRange.endIso,
      }),
    enabled: !!openModal && openModal.toLowerCase().includes('citas'),
  })

  const { data: modalVentas } = useQuery({
    queryKey: ['dashboard', 'modal', 'ventas'],
    queryFn: () => fetchVentas({ page: 1, page_size: DASHBOARD_MODAL_PAGE_SIZE }),
    enabled:
      !!openModal &&
      (openModal.toLowerCase().includes('ventas') ||
        openModal.toLowerCase().includes('ingresos') ||
        openModal.toLowerCase().includes('ticket')),
  })

  const periodoLabel = dias === 1 ? 'hoy' : `${dias} días`
  const modalType = useMemo<'citas' | 'ventas' | 'notificaciones' | 'none'>(() => {
    if (!openModal) return 'none'
    const k = openModal.toLowerCase()
    if (k.includes('citas') || k.includes('pendientes') || k.includes('confirmadas') || k.includes('revisión') || k.includes('atendidas') || k.includes('canceladas') || k.includes('urgentes') || k.includes('sala') || k.includes('espera')) return 'citas'
    if (k.includes('ventas') || k.includes('ingresos') || k.includes('ticket')) return 'ventas'
    if (k.includes('notif')) return 'notificaciones'
    return 'none'
  }, [openModal])

  const { data: modalNotifs } = useQuery({
    queryKey: ['dashboard', 'modal', 'notificaciones', dias],
    queryFn: () => fetchDashboardNotificaciones({ dias, page: 1, page_size: DASHBOARD_MODAL_PAGE_SIZE }),
    enabled: modalType === 'notificaciones',
  })

  const modalColumnDefs = useMemo(() => {
    if (modalType === 'citas') {
      return [
        { key: 'fecha', label: 'Fecha' },
        { key: 'estado', label: 'Estado' },
        { key: 'servicio', label: 'Servicio' },
        { key: 'vet', label: 'Vet' },
        { key: 'flags', label: 'Flags' },
      ]
    }
    if (modalType === 'ventas') {
      return [
        { key: 'fecha', label: 'Fecha' },
        { key: 'numero_interno', label: 'Nº interno' },
        { key: 'cliente_id', label: 'Cliente #' },
        { key: 'items', label: 'Items' },
        { key: 'total', label: 'Total' },
      ]
    }
    if (modalType === 'notificaciones') {
      return [
        { key: 'fecha', label: 'Fecha' },
        { key: 'canal', label: 'Canal' },
        { key: 'evento', label: 'Evento' },
        { key: 'destino', label: 'Destino' },
        { key: 'estado', label: 'Estado' },
        { key: 'proveedor', label: 'Proveedor' },
        { key: 'error', label: 'Error' },
      ]
    }
    return []
  }, [modalType])
  const boardTemplates = useMemo(
    () => [
      { id: 'ventas', title: `Ventas (${periodoLabel})`, value: data?.ventas_hoy ?? 0 },
      { id: 'ingresos', title: `Ingresos (${periodoLabel})`, value: `$${(data?.ingresos_hoy ?? 0).toFixed(2)}` },
      { id: 'consultas', title: `Consultas (${periodoLabel})`, value: data?.consultas_totales_periodo ?? 0 },
      { id: 'espera', title: 'En sala de espera', value: data?.en_sala_espera_ahora ?? 0 },
    ],
    [data?.consultas_totales_periodo, data?.en_sala_espera_ahora, data?.ingresos_hoy, data?.ventas_hoy, periodoLabel],
  )

  function addBoard(templateId: string) {
    const tpl = boardTemplates.find((t) => t.id === templateId)
    if (!tpl) return
    setCustomBoards((prev) => {
      if (prev.some((p) => p.id === tpl.id)) return prev
      return [...prev, tpl]
    })
    setOpenAddBoard(false)
    setActiveTab('personalizados')
  }

  const kpis = [
    { label: `Citas (${periodoLabel})`, value: data?.total_hoy ?? 0 },
    { label: 'Pendientes', value: data?.pendientes_hoy ?? 0 },
    { label: 'Confirmadas', value: data?.confirmadas_hoy ?? 0 },
    { label: 'En revisión', value: data?.en_revision_hoy ?? 0 },
    { label: 'Atendidas', value: data?.atendidas_hoy ?? 0 },
    { label: 'Canceladas', value: data?.canceladas_hoy ?? 0 },
    { label: `Urgentes (${periodoLabel})`, value: data?.urgentes_hoy ?? 0 },
    { label: 'En sala de espera', value: data?.en_sala_espera_ahora ?? 0 },
    { label: `Espera promedio (${periodoLabel})`, value: data?.espera_promedio_min_hoy ?? 0 },
    { label: `Ventas (${periodoLabel})`, value: data?.ventas_hoy ?? 0 },
    { label: `Ingresos (${periodoLabel})`, value: `$${(data?.ingresos_hoy ?? 0).toFixed(2)}` },
    { label: `Ticket promedio (${periodoLabel})`, value: `$${(data?.ticket_promedio_hoy ?? 0).toFixed(2)}` },
    { label: 'Notif email (hoy)', value: data?.notificaciones_email_hoy ?? 0 },
    { label: 'Notif SMS (hoy)', value: data?.notificaciones_sms_hoy ?? 0 },
    { label: 'Notif WhatsApp (hoy)', value: data?.notificaciones_whatsapp_hoy ?? 0 },
    { label: 'Notif fallidas (hoy)', value: data?.notificaciones_fallidas_hoy ?? 0 },
  ]

  const modalRows = useMemo(() => {
    const q = modalSearch.trim().toLowerCase()
    if (!openModal || modalType === 'none') return []
    if (modalType === 'citas') {
      const rows = (modalCitas?.items ?? []).map((c) => ({
        fecha: formatDateTime(c.fecha),
        estado: c.estado ?? '—',
        servicio: c.motivo ?? '—',
        vet: c.veterinario_id != null ? `#${c.veterinario_id}` : '—',
        flags: `${c.urgente ? 'Urgente ' : ''}${c.en_sala_espera ? 'En sala' : ''}`.trim() || '—',
      }))
      return q ? rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q)) : rows
    }
    if (modalType === 'ventas') {
      const start = new Date(modalRange.startIso).getTime()
      const end = new Date(modalRange.endIso).getTime()
      const rows = (modalVentas?.items ?? [])
        .filter((v) => {
          const t = v.fecha ? new Date(v.fecha).getTime() : NaN
          return Number.isNaN(t) ? false : t >= start && t <= end
        })
        .map((v) => ({
          fecha: formatDateTime(v.fecha),
          numero_interno: v.codigo_interno ?? '—',
          cliente_id: v.cliente_id != null ? String(v.cliente_id) : '—',
          items: String(v.items?.length ?? 0),
          total: `$${Number(v.total ?? 0).toFixed(2)}`,
        }))
      return q ? rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q)) : rows
    }
    if (modalType === 'notificaciones') {
      const rows = (modalNotifs?.items ?? []).map((n) => ({
        fecha: formatDateTime(n.created_at),
        canal: n.canal,
        evento: n.tipo_evento,
        destino: n.destino ?? '—',
        estado: n.estado,
        proveedor: n.proveedor ?? '—',
        error: n.error ?? '—',
      }))
      return q ? rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q)) : rows
    }
    return []
  }, [modalCitas?.items, modalRange.endIso, modalRange.startIso, modalSearch, modalType, modalVentas?.items, modalNotifs?.items, openModal])

  const visibleModalColumns = useMemo(
    () => modalColumnDefs.filter((c) => csvColumns[c.key]),
    [csvColumns, modalColumnDefs],
  )

  useEffect(() => {
    if (!openModal) return
    const next: Record<string, boolean> = {}
    modalColumnDefs.forEach((c) => {
      next[c.key] = true
    })
    setCsvColumns(next)
    setModalSearch('')
  }, [modalColumnDefs, openModal])

  function exportModalCsv() {
    if (!openModal || modalRows.length === 0) return
    const selected = modalColumnDefs.filter((c) => csvColumns[c.key])
    if (selected.length === 0) return

    const header = selected.map((c) => c.label)
    const lines = [
      header.join(','),
      ...modalRows.map((r) =>
        selected
          .map((c) => `"${String(r[c.key as keyof typeof r] ?? '').replace(/"/g, '""')}"`)
          .join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard_${openModal.replace(/\s+/g, '_').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando dashboard...</p>
  }
  if (isError || !data) {
    return <p className="text-sm text-red-600">No se pudo cargar el dashboard.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDias(1)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              dias === 1
                ? 'bg-primary-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setDias(7)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              dias === 7
                ? 'bg-primary-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            7 días
          </button>
          <button
            type="button"
            onClick={() => setDias(30)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              dias === 30
                ? 'bg-primary-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            30 días
          </button>
          <button
            type="button"
            onClick={() => setOpenAddBoard(true)}
            className="rounded-xl bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            Añadir tablero
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['resumen', 'Resumen'],
          ['consultas', 'Consultas'],
          ['ventas', 'Ventas'],
          ['personalizados', 'Tableros'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              activeTab === key
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'resumen' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((k) => (
              <button
                key={k.label}
                type="button"
                onClick={() => setOpenModal(k.label)}
                className="text-left"
              >
                <Card className="cursor-pointer ring-0 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-primary-200/70" title={k.label}>
                  <p className={`text-3xl font-bold ${kpiColor(k.label)}`}>{k.value}</p>
                </Card>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title={`Top veterinarios (${periodoLabel})`}>
              <div className="space-y-2">
                {data.top_veterinarios_hoy.map((v) => (
                  <div key={v.veterinario_id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm text-slate-700">{v.nombre}</span>
                    <span className="text-sm font-semibold text-primary-700">{v.citas} citas</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Atendidas (últimos 7 días)">
              <div className="space-y-2">
                {data.atendidas_ultimos_7_dias.map((d) => (
                  <div key={d.fecha} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm text-slate-700">{d.fecha}</span>
                    <span className="text-sm font-semibold text-emerald-700">{d.atendidas}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}

      {activeTab === 'consultas' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title={`Consultas (${periodoLabel})`}>
            <p className="text-3xl font-bold text-primary-700">{data.consultas_totales_periodo}</p>
          </Card>
          <Card title="Top motivos de consulta">
            <div className="space-y-2">
              {data.top_motivos_consulta.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos en este periodo.</p>
              ) : (
                data.top_motivos_consulta.map((m, idx) => (
                  <div key={`${m.texto}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm text-slate-700">{m.texto}</span>
                    <span className="text-sm font-semibold text-primary-700">{m.cantidad}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card title="Top tratamientos">
            <div className="space-y-2">
              {data.top_tratamientos.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos en este periodo.</p>
              ) : (
                data.top_tratamientos.map((t, idx) => (
                  <div key={`${t.texto}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm text-slate-700">{t.texto}</span>
                    <span className="text-sm font-semibold text-emerald-700">{t.cantidad}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'ventas' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title={`Top productos vendidos (${periodoLabel})`}>
            <div className="space-y-2">
              {data.top_productos_hoy.map((p) => (
                <div key={p.producto_id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm text-slate-700">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.unidades} und.</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">${p.ingresos.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Ventas e ingresos (últimos 7 días)">
            <div className="space-y-2">
              {data.ventas_ultimos_7_dias.map((d) => (
                <div key={d.fecha} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">{d.fecha}</span>
                  <span className="text-xs text-slate-600">{d.ventas} ventas</span>
                  <span className="text-sm font-semibold text-primary-700">${d.ingresos.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'personalizados' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customBoards.length === 0 ? (
            <Card title="Sin tableros">
              <p className="text-sm text-slate-500">Usa “Añadir tablero” para crear widgets rápidos.</p>
            </Card>
          ) : (
            customBoards.map((w) => (
              <Card key={w.id} title={w.title}>
                <p className="text-3xl font-bold text-primary-700">{w.value}</p>
              </Card>
            ))
          )}
        </div>
      ) : null}

      <Modal open={openAddBoard} title="Añadir tablero" onClose={() => setOpenAddBoard(false)}>
        <p className="mb-3 text-sm text-slate-600">Selecciona una plantilla rápida para tu tablero.</p>
        <div className="space-y-2">
          {boardTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => addBoard(tpl.id)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="text-sm text-slate-700">{tpl.title}</span>
              <span className="text-sm font-semibold text-primary-700">{tpl.value}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={!!openModal} title={openModal ?? 'Detalle'} onClose={() => setOpenModal(null)}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <input
              type="text"
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="Buscar en detalle..."
              className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
            {canExportDashboard ? (
              <button
                type="button"
                onClick={exportModalCsv}
                disabled={visibleModalColumns.length === 0}
                className="rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-100"
              >
                Exportar CSV
              </button>
            ) : (
              <span className="text-xs text-slate-500">Exportación no permitida para tu perfil admin</span>
            )}
          </div>
          {canExportDashboard ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-600">Columnas CSV:</span>
              {modalColumnDefs.map((c) => (
                <label key={c.key} className="inline-flex items-center gap-1 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!csvColumns[c.key]}
                    onChange={(e) => setCsvColumns((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          ) : null}
          <div className="rounded-xl border border-slate-200">
            {visibleModalColumns.length > 0 ? (
              <div
                className="grid border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
                style={{ gridTemplateColumns: `repeat(${visibleModalColumns.length}, minmax(120px, 1fr))` }}
              >
                {visibleModalColumns.map((c) => (
                  <span key={c.key} className={c.key === 'total' ? 'text-right' : ''}>
                    {c.label}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="max-h-[45vh] overflow-auto">
              {visibleModalColumns.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-500">Selecciona al menos una columna para ver datos.</p>
              ) : modalRows.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-500">Sin resultados para este periodo/filtro.</p>
              ) : (
                modalRows.map((r, idx) => (
                  <div
                    key={`${Object.values(r).join('-')}-${idx}`}
                    className="grid border-b border-slate-100 px-3 py-2 text-sm text-slate-700"
                    style={{ gridTemplateColumns: `repeat(${visibleModalColumns.length}, minmax(120px, 1fr))` }}
                  >
                    {visibleModalColumns.map((c) => (
                      <span key={`${c.key}-${idx}`} className={c.key === 'total' ? 'text-right font-medium' : ''}>
                        {String(r[c.key as keyof typeof r] ?? '—')}
                      </span>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
