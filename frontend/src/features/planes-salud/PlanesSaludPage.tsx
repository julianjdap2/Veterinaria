import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import type { PlanAfiliacion, PlanSalud, PlanSaludMeta } from '../../api/types'
import { useEspecies } from '../catalogo/hooks/useEspecies'
import { useMascotas } from '../mascotas/hooks/useMascotas'
import { ClienteSearchSelect } from '../clientes/components/ClienteSearchSelect'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '../../shared/ui/Table'
import {
  createAfiliacion,
  createPlanSalud,
  deleteAfiliacion,
  deletePlanSalud,
  fetchAfiliaciones,
  fetchPlanSaludMeta,
  fetchPlanesSalud,
  patchModuloPlanesSalud,
  updateAfiliacion,
  updatePlanSalud,
} from './api'

function money(n: string | number | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : Number(n ?? 0)
  if (Number.isNaN(v)) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

function compactMoney(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return money(n)
}

function periodLabel(meses: number): string {
  if (meses === 1) return '1 mes'
  if (meses === 12) return '1 año'
  return `${meses} meses`
}

function periodBadge(meses: number): string {
  if (meses === 1) return '1 MES'
  if (meses === 12) return '1 AÑO'
  return `${meses} MESES`
}

function addMonthsLocal(d: Date, months: number): Date {
  const day = d.getDate()
  const next = new Date(d.getTime())
  next.setMonth(next.getMonth() + months)
  if (next.getDate() < day) next.setDate(0)
  return next
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateInput(s: string): Date {
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10))
  return new Date(y, m - 1, d)
}

function especieEmoji(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.includes('can')) return '🐶'
  if (n.includes('fel')) return '🐱'
  if (n.includes('equ')) return '🐴'
  if (n.includes('bov')) return '🐄'
  if (n.includes('rod')) return '🐭'
  if (n.includes('rep')) return '🐢'
  if (n.includes('porc') || n.includes('sui')) return '🐷'
  if (n.includes('lago') || n.includes('cone')) return '🐰'
  if (n.includes('ave') || n.includes('avi')) return '🦜'
  if (n.includes('ovi')) return '🐑'
  return '🐾'
}

type CobDraft = {
  key: string
  categoria_codigo: string
  nombre_servicio: string
  cantidad: number
  cobertura_maxima: string
}

function coberturaTotalAprox(plan: PlanSalud): number {
  let t = 0
  for (const c of plan.coberturas) {
    const max = c.cobertura_maxima != null ? Number(c.cobertura_maxima) : 0
    if (!Number.isNaN(max) && max > 0) t += max * (c.cantidad || 1)
  }
  return t
}

export function PlanesSaludPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = (user?.rolId ?? 0) === ROLES.ADMIN

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const headerMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!headerMenuRef.current?.contains(e.target as Node)) setHeaderMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['planes-salud', 'meta'],
    queryFn: fetchPlanSaludMeta,
  })

  const { data: planes = [], isLoading: planesLoading } = useQuery({
    queryKey: ['planes-salud', 'list'],
    queryFn: fetchPlanesSalud,
    enabled: !!meta && meta.modulo_habilitado,
  })

  const moduloOff = meta && !meta.modulo_habilitado

  const patchModulo = useMutation({
    mutationFn: patchModuloPlanesSalud,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planes-salud'] })
    },
  })

  const [planModal, setPlanModal] = useState<{ mode: 'create' | 'edit'; plan: PlanSalud | null } | null>(null)

  const delPlan = useMutation({
    mutationFn: deletePlanSalud,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planes-salud', 'list'] }),
  })

  const [afiliadosPlan, setAfiliadosPlan] = useState<PlanSalud | null>(null)
  const [afiliadoForm, setAfiliadoForm] = useState<
    | { mode: 'create'; plan: PlanSalud }
    | { mode: 'edit'; plan: PlanSalud; af: PlanAfiliacion }
    | null
  >(null)

  const { data: afiliaciones = [], isLoading: afLoading } = useQuery({
    queryKey: ['planes-salud', 'afiliaciones', afiliadosPlan?.id],
    queryFn: () => fetchAfiliaciones(afiliadosPlan!.id),
    enabled: !!afiliadosPlan,
  })

  const [afSearch, setAfSearch] = useState('')
  const afFiltered = useMemo(() => {
    const q = afSearch.trim().toLowerCase()
    if (!q) return afiliaciones
    return afiliaciones.filter((a) => {
      const blob = `${a.cliente_nombre ?? ''} ${a.cliente_documento ?? ''} ${a.mascota_nombre ?? ''}`.toLowerCase()
      return blob.includes(q)
    })
  }, [afiliaciones, afSearch])

  const createAff = useMutation({
    mutationFn: (args: { planId: number; body: Parameters<typeof createAfiliacion>[1] }) =>
      createAfiliacion(args.planId, args.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planes-salud'] })
      setAfiliadoForm(null)
    },
  })

  const updateAff = useMutation({
    mutationFn: (args: { id: number; body: Parameters<typeof updateAfiliacion>[1] }) =>
      updateAfiliacion(args.id, args.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planes-salud'] })
      setAfiliadoForm(null)
    },
  })

  const deleteAff = useMutation({
    mutationFn: deleteAfiliacion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planes-salud'] }),
  })

  const handleDisableModule = useCallback(() => {
    if (!window.confirm('¿Deshabilitar el módulo de planes de salud para esta clínica? Podrás volver a activarlo aquí.')) {
      return
    }
    patchModulo.mutate(false)
    setHeaderMenuOpen(false)
  }, [patchModulo])

  const handleEnableModule = useCallback(() => {
    patchModulo.mutate(true)
  }, [patchModulo])

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          breadcrumbs={[
            { label: 'Inicio', to: '/dashboard' },
            { label: 'Administración', to: '/configuracion-operativa' },
            { label: 'Planes de salud' },
          ]}
          title="Planes de salud y servicios"
          subtitle="Paquetes anticipados de servicios: precio, vigencia, coberturas y afiliaciones por mascota."
        />
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && !moduloOff && (
            <Button type="button" onClick={() => setPlanModal({ mode: 'create', plan: null })}>
              + Registrar plan
            </Button>
          )}
          {isAdmin && (
            <div className="relative" ref={headerMenuRef}>
              <Button
                type="button"
                variant="secondary"
                className="px-3"
                aria-label="Más opciones"
                onClick={() => setHeaderMenuOpen((v) => !v)}
              >
                ⋯
              </Button>
              {headerMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-amber-800 hover:bg-amber-50"
                    onClick={handleDisableModule}
                    disabled={moduloOff || patchModulo.isPending}
                  >
                    <span aria-hidden>⚠</span> Deshabilitar módulo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {isAdmin && (
        <p className="-mt-2 text-xs text-slate-500">
          ¿Suscripción al software de la clínica?{' '}
          <Link to="/planes-suscripcion" className="font-medium text-primary-600 hover:underline">
            Planes y suscripción
          </Link>{' '}
          (distinto de los paquetes para mascotas de arriba).
        </p>
      )}

      {metaLoading && <p className="text-sm text-slate-500">Cargando…</p>}

      {moduloOff && (
        <Card className="p-8 text-center">
          <p className="text-slate-700">El módulo de planes de salud está deshabilitado para esta clínica.</p>
          {isAdmin && (
            <Button type="button" className="mt-4" onClick={() => handleEnableModule()} disabled={patchModulo.isPending}>
              Activar módulo
            </Button>
          )}
        </Card>
      )}

      {!moduloOff && !planesLoading && planes.length === 0 && (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="text-3xl text-slate-300" aria-hidden>
            ⓘ
          </span>
          <p className="text-slate-600">No hay planes configurados</p>
          {isAdmin && (
            <Button type="button" onClick={() => setPlanModal({ mode: 'create', plan: null })}>
              + Registrar plan
            </Button>
          )}
        </Card>
      )}

      {!moduloOff && planes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {planes.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              isAdmin={isAdmin}
              onEdit={() => setPlanModal({ mode: 'edit', plan: p })}
              onAfiliados={() => setAfiliadosPlan(p)}
              onDelete={() => {
                if (!window.confirm(`¿Eliminar el plan «${p.nombre}»? Si tiene afiliaciones activas, quedará oculto.`)) {
                  return
                }
                delPlan.mutate(p.id)
              }}
            />
          ))}
        </div>
      )}

      {planModal && (
        <PlanFormModal
          open
          mode={planModal.mode}
          initialPlan={planModal.plan}
          meta={meta}
          onClose={() => setPlanModal(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['planes-salud'] })
            setPlanModal(null)
          }}
        />
      )}

      {afiliadosPlan && (
        <Modal
          open={!afiliadoForm}
          size="xl"
          title={`Afiliados — ${afiliadosPlan.nombre}`}
          onClose={() => {
            setAfiliadosPlan(null)
            setAfSearch('')
          }}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                value={afSearch}
                onChange={(e) => setAfSearch(e.target.value)}
                placeholder="Buscar cliente o mascota…"
                className="min-w-[200px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <Button type="button" onClick={() => setAfiliadoForm({ mode: 'create', plan: afiliadosPlan })}>
                + Registrar afiliado
              </Button>
            </div>

            {afLoading && <p className="text-sm text-slate-500">Cargando afiliaciones…</p>}

            {!afLoading && afFiltered.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                Ningún afiliado aún. Usa «Registrar afiliado» para vincular un propietario y su(s) mascota(s).
              </p>
            )}

            {afFiltered.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-emerald-100/50 ring-1 ring-emerald-50/30">
                <Table plain className="w-full min-w-[640px] text-left text-sm">
                  <TableHead>
                    <TableRow header>
                      <TableTh className="!px-3 !py-2 text-xs">Opc.</TableTh>
                      <TableTh className="!px-3 !py-2 text-xs">Cliente</TableTh>
                      <TableTh className="!px-3 !py-2 text-xs">Mascotas</TableTh>
                      <TableTh className="!px-3 !py-2 text-xs">Usos</TableTh>
                      <TableTh className="!px-3 !py-2 text-xs">Expira</TableTh>
                      <TableTh className="!px-3 !py-2 text-xs">Vinculado</TableTh>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {afFiltered.map((a) => (
                      <TableRow key={a.id}>
                        <TableTd className="!px-3 !py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Editar afiliación"
                              className="rounded border border-slate-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-800 hover:bg-indigo-100"
                              onClick={() => setAfiliadoForm({ mode: 'edit', plan: afiliadosPlan, af: a })}
                            >
                              ✎
                            </button>
                            <Link
                              to={`/planes-salud/cuenta/${a.id}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Estado de cuenta"
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800 hover:bg-red-100"
                            >
                              PDF
                            </Link>
                            <button
                              type="button"
                              title="Eliminar"
                              className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900 hover:bg-amber-100"
                              onClick={() => {
                                if (!window.confirm('¿Dar de baja esta afiliación?')) return
                                deleteAff.mutate(a.id)
                              }}
                            >
                              🗑
                            </button>
                          </div>
                        </TableTd>
                        <TableTd className="!px-3 !py-2">
                          <div className="font-medium text-emerald-800">{a.cliente_documento ?? '—'}</div>
                          <div className="text-slate-600">{a.cliente_nombre ?? '—'}</div>
                        </TableTd>
                        <TableTd className="!px-3 !py-2">{a.mascota_nombre ?? 'Todas (titular)'}</TableTd>
                        <TableTd className="!px-3 !py-2 text-slate-700">{a.resumen_usos || '—'}</TableTd>
                        <TableTd className="!px-3 !py-2">
                          <div>{new Date(a.fecha_fin).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</div>
                          <div className="text-xs text-emerald-700">
                            {Math.max(
                              0,
                              Math.ceil(
                                (new Date(a.fecha_fin).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                              ),
                            )}{' '}
                            días
                          </div>
                        </TableTd>
                        <TableTd className="!px-3 !py-2 text-slate-600">
                          {a.created_at
                            ? new Date(a.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                            : '—'}
                        </TableTd>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-center text-xs text-slate-500">
              Mostrando {afFiltered.length} de {afiliaciones.length} registros
            </p>
          </div>
        </Modal>
      )}

      {afiliadoForm && (
        <AfiliadoFormModal
          open
          mode={afiliadoForm.mode}
          plan={afiliadoForm.plan}
          afiliacion={afiliadoForm.mode === 'edit' ? afiliadoForm.af : null}
          onClose={() => setAfiliadoForm(null)}
          onSubmitCreate={(body) => createAff.mutate({ planId: afiliadoForm.plan.id, body })}
          onSubmitEdit={(id, body) => updateAff.mutate({ id, body })}
          isPending={createAff.isPending || updateAff.isPending}
        />
      )}
    </div>
  )
}

function PlanCard({
  plan,
  isAdmin,
  onEdit,
  onAfiliados,
  onDelete,
}: {
  plan: PlanSalud
  isAdmin: boolean
  onEdit: () => void
  onAfiliados: () => void
  onDelete: () => void
}) {
  const { data: especies = [] } = useEspecies()
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const especiesLabels = plan.especies_ids
    .map((id) => especies.find((e) => e.id === id)?.nombre)
    .filter(Boolean) as string[]

  const totalCov = coberturaTotalAprox(plan)

  return (
    <Card className="relative flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{plan.nombre}</h3>
          <p className="text-xs text-slate-500">
            Última actualización:{' '}
            {plan.updated_at
              ? new Date(plan.updated_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
              : '—'}
          </p>
        </div>
        {isAdmin && (
          <div className="relative" ref={ref}>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Opciones del plan"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-md">
                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={onEdit}>
                  Editar plan
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-red-700 hover:bg-red-50"
                  onClick={onDelete}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Valor</p>
          <p className="font-semibold text-emerald-700">{money(plan.precio)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Cobertura (aprox.)</p>
          <p className="font-semibold text-rose-700">{totalCov > 0 ? compactMoney(totalCov) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Vigencia</p>
          <span className="inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
            {periodBadge(plan.periodicidad_meses)}
          </span>
        </div>
        <div>
          <p className="text-xs text-slate-500">Especies</p>
          <div className="flex flex-wrap gap-1 text-lg" title={especiesLabels.join(', ') || 'Todas'}>
            {especiesLabels.length === 0 ? (
              <span className="text-sm text-slate-500">Todas</span>
            ) : (
              especiesLabels.map((n) => (
                <span key={n} title={n}>
                  {especieEmoji(n)}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-slate-600">Servicios</p>
        <ul className="space-y-0.5 text-sm text-slate-700">
          {plan.coberturas.length === 0 ? (
            <li className="text-slate-400">Sin coberturas definidas</li>
          ) : (
            plan.coberturas.map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.nombre_servicio}</span>
                <span className="text-slate-500"> · {c.cantidad}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-600">
          👥 {plan.afiliaciones_activas}{' '}
          {plan.afiliaciones_activas === 1 ? 'afiliación' : 'afiliaciones'}
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={onAfiliados}>
          Afiliados
        </Button>
      </div>
    </Card>
  )
}

function PlanFormModal({
  open,
  mode,
  initialPlan,
  meta,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: 'create' | 'edit'
  initialPlan: PlanSalud | null
  meta: PlanSaludMeta | undefined
  onClose: () => void
  onSaved: () => void
}) {
  const { data: especies = [] } = useEspecies()
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('0')
  const [periodicidad, setPeriodicidad] = useState(1)
  const [especiesSel, setEspeciesSel] = useState<Set<number>>(new Set())
  const [cobs, setCobs] = useState<CobDraft[]>([])
  const [draft, setDraft] = useState({
    categoria_codigo: '',
    nombre_servicio: '',
    cantidad: 1,
    cobertura_maxima: '',
  })

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initialPlan) {
      setNombre(initialPlan.nombre)
      setPrecio(String(initialPlan.precio ?? 0))
      setPeriodicidad(initialPlan.periodicidad_meses)
      setEspeciesSel(new Set(initialPlan.especies_ids ?? []))
      setCobs(
        initialPlan.coberturas.map((c) => ({
          key: `e-${c.id}`,
          categoria_codigo: c.categoria_codigo,
          nombre_servicio: c.nombre_servicio,
          cantidad: c.cantidad,
          cobertura_maxima:
            c.cobertura_maxima != null && Number(c.cobertura_maxima) > 0 ? String(c.cobertura_maxima) : '',
        })),
      )
    } else {
      setNombre('')
      setPrecio('0')
      setPeriodicidad(meta?.periodicidades_meses?.[0] ?? 1)
      setEspeciesSel(new Set())
      setCobs([])
      setDraft({ categoria_codigo: '', nombre_servicio: '', cantidad: 1, cobertura_maxima: '' })
    }
  }, [open, mode, initialPlan, meta])

  const categorias = meta?.categorias ?? []

  const saveMut = useMutation({
    mutationFn: async () => {
      const precioN = parseFloat(precio.replace(',', '.')) || 0
      const especies_ids = Array.from(especiesSel)
      if (!nombre.trim()) throw new Error('Indica el nombre del plan.')
      if (especies_ids.length === 0) throw new Error('Selecciona al menos una especie.')
      const coberturas = cobs.map((c) => ({
        categoria_codigo: c.categoria_codigo,
        nombre_servicio: c.nombre_servicio.trim(),
        cantidad: c.cantidad,
        cobertura_maxima:
          c.cobertura_maxima.trim() === '' ? null : Math.max(0, parseFloat(c.cobertura_maxima.replace(',', '.')) || 0),
      }))
      if (mode === 'edit' && initialPlan) {
        return updatePlanSalud(initialPlan.id, {
          nombre: nombre.trim(),
          precio: precioN,
          periodicidad_meses: periodicidad,
          especies_ids,
          coberturas,
        })
      }
      return createPlanSalud({
        nombre: nombre.trim(),
        precio: precioN,
        periodicidad_meses: periodicidad,
        especies_ids,
        coberturas,
      })
    },
    onSuccess: () => onSaved(),
  })

  function addCob() {
    if (!draft.categoria_codigo || !draft.nombre_servicio.trim()) return
    setCobs((prev) => [
      ...prev,
      {
        key: `n-${Date.now()}`,
        categoria_codigo: draft.categoria_codigo,
        nombre_servicio: draft.nombre_servicio.trim(),
        cantidad: Math.max(1, draft.cantidad),
        cobertura_maxima: draft.cobertura_maxima,
      },
    ])
    setDraft((d) => ({ ...d, nombre_servicio: '', cantidad: 1, cobertura_maxima: '' }))
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? 'Editar plan de salud' : 'Registrar plan de salud'}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Nombre</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre para el plan de salud"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Precio / valor</span>
            <input
              type="number"
              min={0}
              step="1000"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
            <span className="text-xs text-slate-500">Moneda COP</span>
          </label>
          <div className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Especies</span>
            <div className="mt-2 max-h-36 overflow-auto rounded-xl border border-slate-200 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {especies.map((e) => (
                  <label key={e.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={especiesSel.has(e.id)}
                      onChange={() => {
                        setEspeciesSel((prev) => {
                          const n = new Set(prev)
                          if (n.has(e.id)) n.delete(e.id)
                          else n.add(e.id)
                          return n
                        })
                      }}
                    />
                    <span>
                      {especieEmoji(e.nombre)} {e.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Periodicidad / vigencia</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={periodicidad}
              onChange={(e) => setPeriodicidad(parseInt(e.target.value, 10))}
            >
              {(meta?.periodicidades_meses ?? [1, 3, 6, 12]).map((m) => (
                <option key={m} value={m}>
                  {periodLabel(m)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="rounded-2xl border-2 border-teal-200/80 bg-teal-50/30 p-4">
          <legend className="px-1 text-sm font-semibold text-teal-900">Coberturas</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Formulario</span>
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={draft.categoria_codigo}
                onChange={(e) => setDraft((d) => ({ ...d, categoria_codigo: e.target.value }))}
              >
                <option value="">Seleccione una opción</option>
                {categorias.map((c: { codigo: string; label: string }) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Nombre del servicio</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={draft.nombre_servicio}
                onChange={(e) => setDraft((d) => ({ ...d, nombre_servicio: e.target.value }))}
                placeholder="Nombre para el servicio"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Cantidad ℹ️</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={draft.cantidad}
                onChange={(e) => setDraft((d) => ({ ...d, cantidad: parseInt(e.target.value, 10) || 1 }))}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Cobertura máxima (COP) ⚠️</span>
              <input
                type="number"
                min={0}
                step="1000"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={draft.cobertura_maxima}
                onChange={(e) => setDraft((d) => ({ ...d, cobertura_maxima: e.target.value }))}
                placeholder="0"
              />
            </label>
          </div>
          <Button type="button" variant="secondary" className="mt-3 w-full border-primary-300 text-primary-700" onClick={addCob}>
            + Agregar
          </Button>

          {cobs.length > 0 && (
            <div className="mt-4">
              <Table plain className="w-full text-sm">
                <TableHead>
                  <TableRow header>
                    <TableTh className="!py-1 !pl-0 !pr-2 text-xs">Servicio</TableTh>
                    <TableTh className="!py-1 !px-2 text-xs">Cant.</TableTh>
                    <TableTh className="!py-1 !px-2 text-xs">Máx.</TableTh>
                    <TableTh className="w-8 !py-1 !pl-2 !pr-0 text-xs">
                      <span className="sr-only">Eliminar</span>
                    </TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cobs.map((c) => (
                    <TableRow key={c.key}>
                      <TableTd className="!py-1 !pl-0 !pr-2">{c.nombre_servicio}</TableTd>
                      <TableTd className="!py-1 !px-2">{c.cantidad}</TableTd>
                      <TableTd className="!py-1 !px-2">
                        {c.cobertura_maxima ? money(parseFloat(c.cobertura_maxima)) : '—'}
                      </TableTd>
                      <TableTd className="!py-1 !pl-2 !pr-0">
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => setCobs((prev) => prev.filter((x) => x.key !== c.key))}
                        >
                          🗑
                        </button>
                      </TableTd>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </fieldset>

        {saveMut.error && (
          <p className="text-sm text-red-600">
            {(saveMut.error as Error).message || 'No se pudo guardar. Revisa los datos.'}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
          >
            💾 Guardar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AfiliadoFormModal({
  open,
  mode,
  plan,
  afiliacion,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
  isPending,
}: {
  open: boolean
  mode: 'create' | 'edit'
  plan: PlanSalud
  afiliacion: PlanAfiliacion | null
  onClose: () => void
  onSubmitCreate: (body: Parameters<typeof createAfiliacion>[1]) => void
  onSubmitEdit: (id: number, body: Parameters<typeof updateAfiliacion>[1]) => void
  isPending: boolean
}) {
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [mascotaId, setMascotaId] = useState<number | ''>('')
  const [valor, setValor] = useState(String(plan.precio ?? 0))
  const [ini, setIni] = useState(() => toDateInputValue(new Date()))
  const [fin, setFin] = useState(() => toDateInputValue(addMonthsLocal(new Date(), plan.periodicidad_meses)))
  const [obs, setObs] = useState('')

  const { data: mascotasData } = useMascotas(
    { page: 1, page_size: 100, cliente_id: clienteId ?? undefined },
    { enabled: !!clienteId },
  )
  const mascotas = mascotasData?.items ?? []

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && afiliacion) {
      setClienteId(afiliacion.cliente_id)
      setMascotaId(afiliacion.mascota_id ?? '')
      setValor(String(afiliacion.valor_pagado ?? plan.precio ?? 0))
      setIni(afiliacion.fecha_inicio.slice(0, 10))
      setFin(afiliacion.fecha_fin.slice(0, 10))
      setObs(afiliacion.observaciones ?? '')
    } else {
      setClienteId(null)
      setMascotaId('')
      setValor(String(plan.precio ?? 0))
      const hoy = new Date()
      setIni(toDateInputValue(hoy))
      setFin(toDateInputValue(addMonthsLocal(hoy, plan.periodicidad_meses)))
      setObs('')
    }
  }, [open, mode, afiliacion, plan])

  useEffect(() => {
    if (mode !== 'create' || !open) return
    const d0 = parseDateInput(ini)
    setFin(toDateInputValue(addMonthsLocal(d0, plan.periodicidad_meses)))
  }, [ini, plan.periodicidad_meses, mode, open])

  if (!open) return null

  function submit() {
    const valorN = parseFloat(valor.replace(',', '.')) || 0
    const mid = mascotaId === '' ? null : Number(mascotaId)
    if (mode === 'create') {
      if (!clienteId) return
      onSubmitCreate({
        cliente_id: clienteId,
        mascota_id: mid,
        fecha_inicio: ini,
        fecha_fin: fin,
        valor_pagado: valorN,
        observaciones: obs.trim() || null,
      })
      return
    }
    if (afiliacion) {
      onSubmitEdit(afiliacion.id, {
        mascota_id: mid,
        fecha_inicio: ini,
        fecha_fin: fin,
        valor_pagado: valorN,
        observaciones: obs.trim() || null,
      })
    }
  }

  return (
    <Modal
      open
      title={mode === 'edit' ? `Editar afiliación — ${plan.nombre}` : `Registro de afiliado — ${plan.nombre}`}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4">
        {mode === 'create' && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700">Propietario</span>
            <Link to="/clientes/nuevo" className="text-sm font-medium text-primary-600 hover:underline">
              + Registrar propietario
            </Link>
          </div>
        )}

        {mode === 'create' && (
          <ClienteSearchSelect
            value={clienteId}
            onChange={setClienteId}
            placeholder="Identificación, celular/teléfono o nombre del propietario"
          />
        )}

        {mode === 'edit' && afiliacion && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {afiliacion.cliente_documento && (
              <span className="font-semibold text-primary-700">{afiliacion.cliente_documento} · </span>
            )}
            {afiliacion.cliente_nombre}
          </p>
        )}

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Mascotas</span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={mascotaId === '' ? '' : String(mascotaId)}
            onChange={(e) => setMascotaId(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            disabled={mode === 'create' && !clienteId}
          >
            <option value="">Sin filtro: todas las vinculadas al propietario</option>
            {mascotas.map((m) => (
              <option key={m.id} value={m.id}>
                🐾 {m.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Valor</span>
            <input
              type="number"
              min={0}
              step="1000"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Inicia</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={ini}
              onChange={(e) => setIni(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Vencimiento</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Observaciones</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Observaciones o detalles"
          />
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending || (mode === 'create' && !clienteId)}
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
