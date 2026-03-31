import { Link, useParams, useLocation } from 'react-router-dom'
import { useQueryClient, useQueries } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Eye,
  ClipboardList,
  Pencil,
  FileText,
  FlaskConical,
  HeartPulse,
  MessageCircle,
  PawPrint,
  Pill,
  Scissors,
  ShieldPlus,
  Stethoscope,
  Syringe,
} from 'lucide-react'
import { useEspecies } from '../catalogo/hooks/useEspecies'
import { useAllRazas } from '../catalogo/hooks/useRazas'
import { useConsultasByMascota } from '../consultas/hooks/useConsultasByMascota'
import { CitaEstadoBadge } from '../citas/citaEstadoBadge'
import { useCitasByMascota } from '../citas/hooks/useCitasAgenda'
import { useMascotaDetail } from './hooks/useMascotaDetail'
import { useClienteDetail } from '../clientes/hooks/useClienteDetail'
import { useVeterinarios } from '../usuarios/hooks/useUsuarios'
import { ConsultaRegistroModal } from '../consultas/components/ConsultaRegistroModal'
import { PlanSaludMascotaBanner } from '../planes-salud/components/PlanSaludMascotaBanner'
import { MascotaHistoriaPanel } from './components/MascotaHistoriaPanel'
import { FormulaMedicaOpcionesMenu } from './components/FormulaMedicaOpcionesMenu'
import { updateMascotaActivo } from './api'
import { mascotasKeys } from './hooks/useMascotas'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Alert } from '../../shared/ui/Alert'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import { useCallback, useMemo, useState } from 'react'
import { RegistroFormulaMedicaModal } from '../consultas/components/RegistroFormulaMedicaModal'
import { fetchFormula } from '../consultas/api'
import type { Consulta, FormulaItem } from '../../api/types'

type ModuloHistoria = {
  key: string
  label: string
  count: number
  icon: React.ComponentType<{ className?: string }>
}

function formatDateTime(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return s
  }
}

function truncElipsis(s: string | null | undefined, max: number): string {
  if (s == null || s === '') return '—'
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/** Fecha de fórmula alineada a consulta (YYYY-MM-DD). */
function fechaFormulaSoloFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return '—'
  }
}

/** Texto tipo «1. paracetamol (caja) #2. vía oral» por ítem. */
function textoLineaMedicamento(it: FormulaItem, index: number): string {
  const name = it.producto_nombre ?? `Producto #${it.producto_id}`
  const pres = it.presentacion?.trim() ? ` (${it.presentacion.trim()})` : ''
  const obs = it.observacion?.trim() ? `. ${it.observacion.trim()}` : ''
  return `${index + 1}. ${name}${pres} #${it.cantidad}${obs}`
}

function textoMedicamentosCelda(items: FormulaItem[]): string {
  return items.map((it, i) => textoLineaMedicamento(it, i)).join('\n')
}

export function MascotaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const fromCitas = (location.state as { from?: string } | null)?.from === '/citas'
  const numId = id ? parseInt(id, 10) : null
  const queryClient = useQueryClient()
  const { data: mascota, isLoading, isError } = useMascotaDetail(numId)
  const { data: cliente } = useClienteDetail(mascota?.cliente_id ?? null)
  const { data: consultas = [], isLoading: loadingConsultas } = useConsultasByMascota(numId)
  const { data: citas = [], isLoading: loadingCitas } = useCitasByMascota(numId)
  const { data: especies = [] } = useEspecies()
  const { data: razas = [] } = useAllRazas()
  const especiesMap = new Map(especies.map((s) => [s.id, s.nombre]))
  const razasMap = new Map(razas.map((r) => [r.id, r.nombre ?? `Raza ${r.id}`]))
  const [error, setError] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState(false)
  const [seccionActiva, setSeccionActiva] = useState<'historia' | 'consultas' | 'citas' | 'formulas'>('historia')
  const [registroConsultaOpen, setRegistroConsultaOpen] = useState(false)
  /** true = abierto desde Fórmulas médicas (mismo SOAP, titulación «Nueva fórmula»). */
  const [registroConsultaDesdeFormulas, setRegistroConsultaDesdeFormulas] = useState(false)
  const [formulaRegistro, setFormulaRegistro] = useState<{
    consultaId: number
    diagnostico: string
    observaciones: string
    fechaConsultaIso: string | null
  } | null>(null)
  /** Editar fórmula desde la tabla (modal, no navegación). */
  const [formulaEdicion, setFormulaEdicion] = useState<{
    consultaId: number
    diagnostico: string
    observaciones: string
    fechaConsultaIso: string | null
  } | null>(null)
  const [formulaTablaSort, setFormulaTablaSort] = useState<{
    key: 'fecha' | 'diagnostico' | 'usuario'
    dir: 'asc' | 'desc'
  }>({ key: 'fecha', dir: 'desc' })

  const irASeccion = useCallback((key: 'historia' | 'consultas' | 'citas' | 'formulas') => {
    setSeccionActiva(key)
  }, [])

  const { data: veterinarios = [] } = useVeterinarios()
  const nombreVeterinario = useMemo(() => new Map(veterinarios.map((u) => [u.id, u.nombre])), [veterinarios])

  const formulaQueries = useQueries({
    queries: consultas.map((c) => ({
      queryKey: ['consultas', 'formula', c.id] as const,
      queryFn: () => fetchFormula(c.id),
      enabled: numId != null && consultas.length > 0,
    })),
  })

  const formulasPorConsulta = useMemo(() => {
    const out: { consulta: Consulta; items: FormulaItem[] }[] = []
    consultas.forEach((c, i) => {
      const items = formulaQueries[i]?.data
      if (items && items.length > 0) out.push({ consulta: c, items })
    })
    return out
  }, [consultas, formulaQueries])

  const loadingFormulas =
    numId != null &&
    consultas.length > 0 &&
    formulaQueries.some((q) => q.isLoading || q.isFetching)

  const formulasPorConsultaOrdenadas = useMemo(() => {
    const arr = [...formulasPorConsulta]
    const { key, dir } = formulaTablaSort
    arr.sort((a, b) => {
      let cmp = 0
      if (key === 'fecha') {
        const ta = new Date(a.consulta.fecha_consulta ?? a.consulta.created_at ?? 0).getTime()
        const tb = new Date(b.consulta.fecha_consulta ?? b.consulta.created_at ?? 0).getTime()
        cmp = ta - tb
      } else if (key === 'diagnostico') {
        cmp = (a.consulta.diagnostico ?? '').localeCompare(b.consulta.diagnostico ?? '', 'es', {
          sensitivity: 'base',
        })
      } else {
        const na = nombreVeterinario.get(a.consulta.veterinario_id) ?? ''
        const nb = nombreVeterinario.get(b.consulta.veterinario_id) ?? ''
        cmp = na.localeCompare(nb, 'es', { sensitivity: 'base' })
      }
      return dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [formulasPorConsulta, formulaTablaSort, nombreVeterinario])

  function toggleFormulaSort(col: 'fecha' | 'diagnostico' | 'usuario') {
    setFormulaTablaSort((prev) =>
      prev.key === col ? { key: col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: col, dir: 'desc' },
    )
  }

  async function handleReactivar() {
    if (!numId || !mascota) return
    setError(null)
    setReactivating(true)
    try {
      await updateMascotaActivo(numId, true)
      queryClient.invalidateQueries({ queryKey: ['mascotas', numId] })
      queryClient.invalidateQueries({ queryKey: mascotasKeys().list({ page: 1, page_size: 20 }) })
      toast.success('Mascota reactivada correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al reactivar.'
      setError(msg)
      toast.error(msg)
    } finally {
      setReactivating(false)
    }
  }

  if (numId == null || isError) {
    return (
      <div className="space-y-4">
        <Link to="/mascotas" className="text-primary-600 hover:underline text-sm">
          ← Volver a mascotas
        </Link>
        <p className="text-red-600">Mascota no encontrada.</p>
      </div>
    )
  }

  if (isLoading || !mascota) {
    return (
      <div className="w-full space-y-6 pb-10">
        <div className="border-b border-slate-200/90 pb-6">
          <div className="mb-3 h-2.5 w-36 animate-pulse rounded bg-slate-200/90" />
          <div className="h-8 w-52 max-w-full animate-pulse rounded-md bg-slate-200/90" />
          <div className="mt-3 h-4 w-2/3 max-w-md animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,280px)_1fr]">
          <div className="h-[22rem] animate-pulse rounded-2xl border border-slate-100 bg-white/60 shadow-sm" />
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl border border-slate-100 bg-white/60 shadow-sm" />
            <div className="h-48 animate-pulse rounded-2xl border border-slate-100 bg-white/60 shadow-sm" />
          </div>
        </div>
      </div>
    )
  }

  const modulosNavegacion: ModuloHistoria[] = [
    { key: 'historia', label: 'Historia', count: 0, icon: ClipboardList },
    { key: 'consultas', label: 'Consultas', count: consultas.length, icon: Stethoscope },
    { key: 'citas', label: 'Citas', count: citas.length, icon: CalendarClock },
    {
      key: 'formulas',
      label: 'Fórmulas médicas',
      count: formulasPorConsulta.length,
      icon: Pill,
    },
  ]

  const modulosFuturos: ModuloHistoria[] = [
    { key: 'vacunaciones', label: 'Vacunaciones', count: 0, icon: Syringe },
    { key: 'desparasitaciones', label: 'Desparasitaciones', count: 0, icon: ShieldPlus },
    { key: 'hospitalizaciones', label: 'Hospitalizaciones / ambulatorios', count: 0, icon: HeartPulse },
    { key: 'cirugias', label: 'Cirugías / procedimientos', count: 0, icon: Scissors },
    { key: 'ordenes', label: 'Órdenes', count: 0, icon: ClipboardList },
    { key: 'examenes', label: 'Exámenes de laboratorio', count: 0, icon: FlaskConical },
    { key: 'imagenes', label: 'Imágenes diagnósticas', count: 0, icon: Activity },
    { key: 'peluqueria', label: 'Peluquería y spa', count: 0, icon: PawPrint },
    { key: 'guarderia', label: 'Guardería', count: 0, icon: PawPrint },
    { key: 'seguimientos', label: 'Seguimientos', count: 0, icon: Activity },
    { key: 'documentos', label: 'Documentos', count: 0, icon: FileText },
    { key: 'remisiones', label: 'Remisiones', count: 0, icon: ClipboardList },
    { key: 'mensajes', label: 'Mensajes al propietario', count: 0, icon: MessageCircle },
  ]
  return (
    <div className="w-full space-y-6 pb-10">
      <PageHeader
        breadcrumbs={[
          { label: 'Mascotas', to: '/mascotas' },
          { label: mascota.nombre },
        ]}
        title={mascota.nombre}
        subtitle="Ficha del paciente y vínculo con el tutor."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!mascota.activo && (
              <Button variant="primary" loading={reactivating} onClick={handleReactivar}>
                Reactivar mascota
              </Button>
            )}
            <Link to={`/clientes/${mascota.cliente_id}`}>
              <Button variant="secondary">Ver cliente</Button>
            </Link>
            <Link to={fromCitas ? '/citas' : '/mascotas'}>
              <Button variant="ghost">{fromCitas ? '← Citas' : '← Listado'}</Button>
            </Link>
          </div>
        }
      />
      <PlanSaludMascotaBanner mascotaId={mascota.id} mascotaNombre={mascota.nombre} />
      {!mascota.activo && (
        <Alert variant="warning">
          Esta mascota está inactiva. No aparecerá en el listado por defecto. Puedes reactivarla.
        </Alert>
      )}
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,288px)_1fr] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <Card
            title="Historia"
            contentClassName="p-0"
            className="shadow-card ring-1 ring-slate-100/80"
          >
            <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-3">
              <p className="text-xs leading-relaxed text-slate-500">
                Elija un módulo para ver solo ese contenido en el panel. Historia muestra resumen y línea de tiempo; Consultas,
                Citas y Fórmulas médicas abren sus listados.
              </p>
            </div>
            <ul className="space-y-0.5 p-2">
              {modulosNavegacion.map((m) => {
                const Icon = m.icon
                const activo = seccionActiva === m.key
                const muestraContador = m.count > 0
                return (
                  <li key={m.key}>
                    <button
                      type="button"
                      onClick={() => irASeccion(m.key as 'historia' | 'consultas' | 'citas' | 'formulas')}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                        activo
                          ? 'bg-primary-50 text-primary-900 shadow-inner-soft ring-1 ring-primary-200/80'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2.5">
                        <Icon className={`h-4 w-4 shrink-0 ${activo ? 'text-primary-600' : 'text-slate-400'}`} />
                        <span className="truncate">{m.label}</span>
                      </span>
                      {muestraContador ? (
                        <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[11px] font-bold text-white tabular-nums">
                          {m.count}
                        </span>
                      ) : (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-200" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
            <details className="group border-t border-slate-100">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <span>Más módulos</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <ul className="space-y-0.5 px-2 pb-3">
                {modulosFuturos.map((m) => {
                  const Icon = m.icon
                  return (
                    <li key={m.key}>
                      <div
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400"
                        title="Próximamente"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-300" />
                        <span className="min-w-0 flex-1 truncate">{m.label}</span>
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Pronto
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </details>
          </Card>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card className="border-primary-200/60 bg-gradient-to-br from-primary-50/90 via-white to-slate-50/80 ring-1 ring-primary-100/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-800">Plan de salud</p>
              <p className="mt-1 text-sm text-slate-700">
                {cliente?.nombre ? `${cliente.nombre} · ` : ''}
                Vigencia estimada activa (vista previa).
              </p>
            </Card>
          </motion.div>
        </aside>
        <div className="min-w-0 space-y-6">
          {seccionActiva === 'historia' && (
            <MascotaHistoriaPanel
              mascota={mascota}
              cliente={cliente}
              especieNombre={mascota.especie_id != null ? especiesMap.get(mascota.especie_id) ?? null : null}
              razaNombre={mascota.raza_id != null ? razasMap.get(mascota.raza_id) ?? null : null}
              consultas={consultas}
              citas={citas}
              nombreVeterinario={nombreVeterinario}
            />
          )}

          {seccionActiva === 'consultas' && (
            <Card contentClassName="p-0" className="overflow-hidden shadow-card ring-1 ring-slate-100/80">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/60 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/40 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 shadow-sm ring-1 ring-emerald-200/60">
                    <Stethoscope className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-emerald-950">Consultas de {mascota.nombre}</h2>
                    <p className="text-xs text-slate-600">Historial clínico registrado en esta clínica.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => {
                    setRegistroConsultaDesdeFormulas(false)
                    setRegistroConsultaOpen(true)
                  }}
                >
                  + Registrar consulta
                </Button>
              </div>
              <div className="p-4">
                {loadingConsultas && (
                  <div className="space-y-2 py-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100/80" />
                    ))}
                  </div>
                )}
                {!loadingConsultas && consultas.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white px-6 py-12 text-center">
                    <Stethoscope className="h-10 w-10 text-emerald-400" />
                    <div className="max-w-sm">
                      <p className="text-sm font-semibold text-slate-800">Sin consultas registradas</p>
                      <p className="mt-1 text-sm text-slate-500">Use el botón superior para crear la primera consulta.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setRegistroConsultaDesdeFormulas(false)
                        setRegistroConsultaOpen(true)
                      }}
                    >
                      + Registrar consulta
                    </Button>
                  </div>
                )}
                {!loadingConsultas && consultas.length > 0 && (
                  <Table plain>
                    <TableHead>
                      <TableRow header>
                        <TableTh className="w-14">Opc.</TableTh>
                        <TableTh>Fecha</TableTh>
                        <TableTh>Motivo</TableTh>
                        <TableTh className="w-[22%]">Examen / notas</TableTh>
                        <TableTh className="w-[22%]">Diagnóstico</TableTh>
                        <TableTh className="w-24">Adjuntos</TableTh>
                        <TableTh>Usuario</TableTh>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {consultas.map((c) => (
                        <TableRow key={c.id}>
                          <TableTd>
                            <Link
                              to={`/consultas/${c.id}`}
                              className="inline-flex rounded-lg border border-emerald-200/80 p-1.5 text-emerald-800 transition hover:bg-emerald-50 hover:ring-1 hover:ring-emerald-200/60"
                              title="Abrir consulta"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </TableTd>
                          <TableTd className="whitespace-nowrap text-sm font-medium tabular-nums text-slate-900">
                            {formatDateTime(c.fecha_consulta ?? c.created_at)}
                          </TableTd>
                          <TableTd className="max-w-[12rem] text-sm font-medium text-slate-900">{c.motivo_consulta ?? '—'}</TableTd>
                          <TableTd className="max-w-xs text-sm text-slate-600">
                            {truncElipsis(c.observaciones, 80)}
                          </TableTd>
                          <TableTd className="text-sm text-slate-700">{truncElipsis(c.diagnostico, 120)}</TableTd>
                          <TableTd className="text-sm text-slate-400">—</TableTd>
                          <TableTd className="text-sm text-slate-700">
                            {nombreVeterinario.get(c.veterinario_id) ?? `#${c.veterinario_id}`}
                          </TableTd>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          )}

          {seccionActiva === 'formulas' && (
            <Card contentClassName="p-0" className="overflow-hidden shadow-card ring-1 ring-slate-100/80">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/70 bg-white px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                    <Pill className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Fórmulas médicas de{' '}
                    <span className="text-primary-600">{mascota.nombre}</span>
                  </h2>
                </div>
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => {
                    setRegistroConsultaDesdeFormulas(true)
                    setRegistroConsultaOpen(true)
                  }}
                >
                  + Registrar fórmula médica
                </Button>
              </div>
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-2">
                <p className="text-xs text-slate-500">
                  Una fila por consulta con medicamentos. El menú lateral cuenta esas consultas. Orden con las columnas.
                </p>
              </div>
              <div className="p-4">
                {loadingFormulas && (
                  <div className="space-y-2 py-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100/80" />
                    ))}
                  </div>
                )}
                {!loadingFormulas && formulasPorConsulta.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white px-6 py-12 text-center">
                    <Pill className="h-10 w-10 text-sky-300" />
                    <div className="max-w-sm">
                      <p className="text-sm font-semibold text-slate-800">Sin fórmulas registradas</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Use «Registrar fórmula médica»: datos clínicos (SOAP) y luego medicamentos.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setRegistroConsultaDesdeFormulas(true)
                        setRegistroConsultaOpen(true)
                      }}
                    >
                      + Registrar fórmula médica
                    </Button>
                  </div>
                )}
                {!loadingFormulas && formulasPorConsulta.length > 0 && (
                  <Table plain>
                    <TableHead>
                      <TableRow header>
                        <TableTh className="w-24">Opc.</TableTh>
                        <TableTh className="whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleFormulaSort('fecha')}
                            className="inline-flex items-center gap-1 uppercase hover:text-emerald-950"
                          >
                            Fecha fórmula
                            <span className="flex flex-col leading-none">
                              <ChevronUp
                                className={`h-3 w-3 ${formulaTablaSort.key === 'fecha' && formulaTablaSort.dir === 'asc' ? 'text-primary-600' : 'text-slate-300'}`}
                              />
                              <ChevronDown
                                className={`-mt-1 h-3 w-3 ${formulaTablaSort.key === 'fecha' && formulaTablaSort.dir === 'desc' ? 'text-primary-600' : 'text-slate-300'}`}
                              />
                            </span>
                          </button>
                        </TableTh>
                        <TableTh className="min-w-[12rem]">
                          <button
                            type="button"
                            onClick={() => toggleFormulaSort('diagnostico')}
                            className="inline-flex items-center gap-1 uppercase hover:text-emerald-950"
                          >
                            Diagnóstico presuntivo y/o final
                            <span className="flex flex-col leading-none">
                              <ChevronUp
                                className={`h-3 w-3 ${formulaTablaSort.key === 'diagnostico' && formulaTablaSort.dir === 'asc' ? 'text-primary-600' : 'text-slate-300'}`}
                              />
                              <ChevronDown
                                className={`-mt-1 h-3 w-3 ${formulaTablaSort.key === 'diagnostico' && formulaTablaSort.dir === 'desc' ? 'text-primary-600' : 'text-slate-300'}`}
                              />
                            </span>
                          </button>
                        </TableTh>
                        <TableTh className="min-w-[14rem]">Medicamentos</TableTh>
                        <TableTh className="whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleFormulaSort('usuario')}
                            className="inline-flex items-center gap-1 uppercase hover:text-emerald-950"
                          >
                            Usuario
                            <span className="flex flex-col leading-none">
                              <ChevronUp
                                className={`h-3 w-3 ${formulaTablaSort.key === 'usuario' && formulaTablaSort.dir === 'asc' ? 'text-primary-600' : 'text-slate-300'}`}
                              />
                              <ChevronDown
                                className={`-mt-1 h-3 w-3 ${formulaTablaSort.key === 'usuario' && formulaTablaSort.dir === 'desc' ? 'text-primary-600' : 'text-slate-300'}`}
                              />
                            </span>
                          </button>
                        </TableTh>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formulasPorConsultaOrdenadas.map(({ consulta: c, items }) => (
                        <TableRow key={c.id}>
                          <TableTd>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormulaEdicion({
                                    consultaId: c.id,
                                    diagnostico: c.diagnostico ?? '',
                                    observaciones: c.observaciones ?? '',
                                    fechaConsultaIso: c.fecha_consulta ?? null,
                                  })
                                }
                                className="inline-flex rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-800"
                                title="Editar fórmula médica"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <FormulaMedicaOpcionesMenu
                                consultaId={c.id}
                                mascotaId={mascota.id}
                                formulaItems={items}
                              />
                            </div>
                          </TableTd>
                          <TableTd className="whitespace-nowrap font-medium tabular-nums text-slate-900">
                            {fechaFormulaSoloFecha(c.fecha_consulta ?? c.created_at)}
                          </TableTd>
                          <TableTd className="max-w-md text-sm text-slate-800">
                            {c.diagnostico?.trim() ? (
                              <span className="break-words uppercase tracking-tight whitespace-pre-wrap">
                                {c.diagnostico.trim()}
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableTd>
                          <TableTd className="max-w-lg text-sm text-slate-700">
                            <span className="whitespace-pre-line leading-relaxed">
                              {textoMedicamentosCelda(items)}
                            </span>
                          </TableTd>
                          <TableTd className="text-sm text-slate-700">
                            {nombreVeterinario.get(c.veterinario_id) ?? `#${c.veterinario_id}`}
                          </TableTd>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          )}

          {seccionActiva === 'citas' && (
            <Card contentClassName="p-0" className="overflow-hidden shadow-card ring-1 ring-slate-100/80">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/60 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/40 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 shadow-sm ring-1 ring-emerald-200/60">
                    <CalendarClock className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-emerald-950">Citas de {mascota.nombre}</h2>
                    <p className="text-xs text-slate-600">Citas vinculadas a esta mascota.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/citas/nuevo" state={{ mascotaId: numId }}>
                    <Button variant="secondary" className="rounded-xl">
                      Nueva cita
                    </Button>
                  </Link>
                  <Link to="/citas" state={{ mascotaId: numId }}>
                    <Button variant="ghost" className="rounded-xl">
                      Ver agenda
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-4">
                {loadingCitas && (
                  <div className="space-y-2 py-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100/80" />
                    ))}
                  </div>
                )}
                {!loadingCitas && citas.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white px-6 py-12 text-center">
                    <CalendarClock className="h-10 w-10 text-emerald-400" />
                    <p className="text-sm text-slate-600">No hay citas para esta mascota.</p>
                    <Link to="/citas/nuevo" state={{ mascotaId: numId }}>
                      <Button>Nueva cita</Button>
                    </Link>
                  </div>
                )}
                {!loadingCitas && citas.length > 0 && (
                  <Table plain>
                    <TableHead>
                      <TableRow header>
                        <TableTh>Fecha</TableTh>
                        <TableTh>Servicio / motivo</TableTh>
                        <TableTh>Estado</TableTh>
                        <TableTh className="w-32">Acciones</TableTh>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {citas.map((c) => (
                        <TableRow key={c.id}>
                          <TableTd className="whitespace-nowrap tabular-nums text-sm font-medium text-slate-900">
                            {formatDateTime(c.fecha ?? null)}
                          </TableTd>
                          <TableTd className="max-w-[14rem] text-sm font-medium text-slate-900">{c.motivo ?? '—'}</TableTd>
                          <TableTd>
                            <CitaEstadoBadge estado={c.estado} />
                          </TableTd>
                          <TableTd>
                            <Link
                              to={`/citas/${c.id}`}
                              state={{ from: '/mascotas', mascotaId: numId }}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/90 transition hover:bg-emerald-50 hover:ring-emerald-300/80"
                            >
                              <Eye className="h-3.5 w-3.5 opacity-80" aria-hidden />
                              Ver
                            </Link>
                          </TableTd>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConsultaRegistroModal
        open={registroConsultaOpen}
        onClose={() => {
          setRegistroConsultaOpen(false)
          setRegistroConsultaDesdeFormulas(false)
        }}
        mascotaId={numId}
        mascotaNombre={mascota.nombre}
        flujoFormula={registroConsultaDesdeFormulas}
        onConsultaCreated={(c) => {
          setFormulaEdicion(null)
          setFormulaRegistro({
            consultaId: c.id,
            diagnostico: c.diagnostico ?? '',
            observaciones: c.observaciones ?? '',
            fechaConsultaIso: c.fecha_consulta ?? null,
          })
        }}
      />
      {(formulaRegistro != null || formulaEdicion != null) && (
        <RegistroFormulaMedicaModal
          open
          variant={formulaEdicion != null ? 'edicion' : 'registro'}
          onAfterGuardado={() => setSeccionActiva('formulas')}
          onClose={() => {
            const cid = formulaRegistro?.consultaId ?? formulaEdicion?.consultaId
            setFormulaRegistro(null)
            setFormulaEdicion(null)
            if (cid != null && numId != null) {
              queryClient.invalidateQueries({ queryKey: ['consultas', 'mascota', numId] })
              queryClient.invalidateQueries({ queryKey: ['consultas', 'formula', cid] })
            }
          }}
          consultaId={(formulaEdicion ?? formulaRegistro)!.consultaId}
          mascotaId={numId!}
          mascotaNombre={mascota.nombre}
          diagnosticoInicial={(formulaEdicion ?? formulaRegistro)!.diagnostico}
          observacionesInicial={(formulaEdicion ?? formulaRegistro)!.observaciones}
          fechaConsultaIso={(formulaEdicion ?? formulaRegistro)!.fechaConsultaIso}
        />
      )}
    </div>
  )
}
