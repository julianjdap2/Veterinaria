import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pill, Plus, Save, X } from 'lucide-react'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { addFormulaItem, deleteFormulaItem, fetchFormula, patchConsulta } from '../api'
import { fetchMascotaById } from '../../mascotas/api'
import { useProductos } from '../../productos/hooks/useProductos'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { toast } from '../../../core/toast-store'
import { ApiError } from '../../../api/errors'
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from '../../../core/listDefaults'
import type { FormulaItem } from '../../../api/types'

type RowState = {
  key: string
  /** Si existe, el ítem ya está persistido (edición). */
  formulaItemId?: number
  producto_id: number
  producto_nombre: string
  presentacion: string
  cantidad: number
  posologia: string
  prodSearch: string
  showResults: boolean
}

function newRow(): RowState {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    producto_id: 0,
    producto_nombre: '',
    presentacion: '',
    cantidad: 1,
    posologia: '',
    prodSearch: '',
    showResults: false,
  }
}

function formulaItemToRow(it: FormulaItem): RowState {
  return {
    key: `f-${it.id}`,
    formulaItemId: it.id,
    producto_id: it.producto_id,
    producto_nombre: it.producto_nombre ?? `Producto #${it.producto_id}`,
    presentacion: it.presentacion ?? '',
    cantidad: it.cantidad,
    posologia: it.observacion ?? '',
    prodSearch: '',
    showResults: false,
  }
}

function fechaFormulaDefault(fechaConsultaIso: string | null | undefined): string {
  if (fechaConsultaIso) {
    try {
      const d = new Date(fechaConsultaIso)
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10)
      }
    } catch {
      /* noop */
    }
  }
  const t = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`
}

function MedicamentoRowEditor({
  row,
  disabled,
  onUpdate,
  onRemove,
  showRemove,
}: {
  row: RowState
  disabled: boolean
  onUpdate: (patch: Partial<RowState>) => void
  onRemove: () => void
  showRemove: boolean
}) {
  const debounced = useDebouncedValue(row.prodSearch.trim(), SEARCH_DEBOUNCE_MS)
  const wrapRef = useRef<HTMLDivElement>(null)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const { data: productosData, isFetching } = useProductos(
    {
      page: 1,
      page_size: 25,
      search: debounced.length >= SEARCH_MIN_CHARS ? debounced : undefined,
      incluir_inactivos: false,
    },
    { enabled: debounced.length >= SEARCH_MIN_CHARS },
  )
  const productos = productosData?.items ?? []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        onUpdateRef.current({ showResults: false })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="rounded-md border border-sky-200/90 bg-sky-50/40 p-1.5 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <Pill className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
          Medicamento
        </div>
        {showRemove && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            <X className="h-3 w-3" aria-hidden />
            Eliminar
          </button>
        )}
      </div>
      <div className="space-y-2">
        <div ref={wrapRef}>
          <label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Nombre
          </label>
          {row.producto_id > 0 ? (
            <div className="flex h-8 min-h-8 flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs">
              <span className="min-w-0 truncate font-medium text-slate-900">{row.producto_nombre}</span>
              <button
                type="button"
                disabled={disabled}
                className="ml-auto shrink-0 text-xs font-medium text-primary-600 hover:underline"
                onClick={() =>
                  onUpdate({
                    producto_id: 0,
                    producto_nombre: '',
                    presentacion: '',
                    prodSearch: '',
                    showResults: false,
                  })
                }
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                type="search"
                value={row.prodSearch}
                onChange={(e) => {
                  onUpdate({ prodSearch: e.target.value, showResults: true })
                }}
                onFocus={() => debounced.length >= SEARCH_MIN_CHARS && onUpdate({ showResults: true })}
                placeholder="Buscar (mín. 2 caracteres)…"
                disabled={disabled}
                autoComplete="off"
                className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
              />
              {row.showResults && debounced.length >= SEARCH_MIN_CHARS && (
                <div className="relative z-20 mt-1 max-h-24 overflow-auto rounded-md border border-slate-200 bg-white text-xs shadow-md">
                  {isFetching && <p className="px-2.5 py-1.5 text-slate-500">Buscando…</p>}
                  {!isFetching && productos.length === 0 && (
                    <p className="px-2.5 py-1.5 text-slate-500">Sin resultados.</p>
                  )}
                  {!isFetching &&
                    productos.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="block w-full px-2.5 py-1.5 text-left hover:bg-primary-50"
                        onClick={() =>
                          onUpdate({
                            producto_id: p.id,
                            producto_nombre: p.nombre,
                            presentacion: p.presentacion ?? '',
                            prodSearch: '',
                            showResults: false,
                          })
                        }
                      >
                        <span className="font-medium text-slate-900">{p.nombre}</span>
                        {p.presentacion ? (
                          <span className="ml-2 text-xs text-slate-500">{p.presentacion}</span>
                        ) : null}
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
        {row.producto_id > 0 ? (
          <div className="grid grid-cols-2 gap-2 gap-y-2 md:grid-cols-12 md:gap-x-2">
            <div className="md:col-span-3">
              <label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Presentación
              </label>
              <input
                type="text"
                placeholder="Presentación"
                value={row.presentacion}
                onChange={(e) => onUpdate({ presentacion: e.target.value })}
                disabled={disabled}
                className="h-9 w-full rounded-md border border-slate-300 px-2.5 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Cantidad
              </label>
              <input
                type="number"
                min={1}
                value={row.cantidad}
                onChange={(e) => onUpdate({ cantidad: parseInt(e.target.value, 10) || 1 })}
                disabled={disabled}
                className="h-9 w-full rounded-md border border-slate-300 px-2.5 text-sm tabular-nums"
              />
            </div>
            <div className="col-span-2 md:col-span-7">
              <label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Posología (administración)
              </label>
              <textarea
                rows={2}
                placeholder="Ej. 1 comprimido cada 12 h por 7 días"
                value={row.posologia}
                onChange={(e) => onUpdate({ posologia: e.target.value })}
                disabled={disabled}
                className="max-h-14 w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-xs leading-snug"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export type RegistroFormulaMedicaModalProps = {
  open: boolean
  onClose: () => void
  consultaId: number
  mascotaId: number
  mascotaNombre: string
  diagnosticoInicial: string
  observacionesInicial: string
  fechaConsultaIso: string | null | undefined
  /** `edicion`: título y leyenda alineados a modificar receta existente. */
  variant?: 'registro' | 'edicion'
  /** Tras guardar con éxito (antes de cerrar). Ej.: enfocar el módulo Fórmulas en la ficha mascota. */
  onAfterGuardado?: () => void
}

export function RegistroFormulaMedicaModal({
  open,
  onClose,
  consultaId,
  mascotaId,
  mascotaNombre,
  diagnosticoInicial,
  observacionesInicial,
  fechaConsultaIso,
  variant = 'registro',
  onAfterGuardado,
}: RegistroFormulaMedicaModalProps) {
  const queryClient = useQueryClient()
  const [fechaFormula, setFechaFormula] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [rows, setRows] = useState<RowState[]>([newRow()])
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'datos' | 'diagnostico' | 'medicamentos' | 'observaciones'>('datos')
  const sessionHydratedRef = useRef(false)
  const snapshotItemIdsRef = useRef<Set<number>>(new Set())
  const snapshotItemsRef = useRef<Map<number, FormulaItem>>(new Map())

  const { data: mascotaDet } = useQuery({
    queryKey: ['mascotas', 'detail', mascotaId],
    queryFn: () => fetchMascotaById(mascotaId),
    enabled: open && mascotaId > 0,
  })

  const formulaQuery = useQuery({
    queryKey: ['consultas', 'formula', consultaId],
    queryFn: () => fetchFormula(consultaId),
    enabled: open && consultaId > 0,
  })
  const formulaReady = formulaQuery.isSuccess
  const formulaLoading = open && consultaId > 0 && (formulaQuery.isPending || formulaQuery.isFetching) && !formulaReady

  useEffect(() => {
    if (!open) {
      sessionHydratedRef.current = false
      return
    }
    sessionHydratedRef.current = false
    setRows([newRow()])
  }, [open, consultaId])

  useEffect(() => {
    if (!open) return
    setFechaFormula(fechaFormulaDefault(fechaConsultaIso))
    setDiagnostico(diagnosticoInicial)
    setObservaciones(observacionesInicial)
    setSaving(false)
  }, [open, consultaId, diagnosticoInicial, observacionesInicial, fechaConsultaIso])

  useEffect(() => {
    if (!open || !formulaReady || sessionHydratedRef.current) return
    sessionHydratedRef.current = true
    const items = formulaQuery.data ?? []
    if (items.length > 0) {
      setRows(items.map(formulaItemToRow))
      snapshotItemIdsRef.current = new Set(items.map((i) => i.id))
      snapshotItemsRef.current = new Map(items.map((i) => [i.id, { ...i }]))
    } else {
      setRows([newRow()])
      snapshotItemIdsRef.current = new Set()
      snapshotItemsRef.current = new Map()
    }
  }, [open, consultaId, formulaReady, formulaQuery.data])

  const pesoLabel =
    mascotaDet?.peso != null && !Number.isNaN(Number(mascotaDet.peso))
      ? `Peso: ${mascotaDet.peso} kg`
      : null

  const tabDefs = [
    { id: 'datos' as const, label: 'Datos generales' },
    { id: 'diagnostico' as const, label: 'Diagnóstico' },
    { id: 'medicamentos' as const, label: 'Medicamentos' },
    { id: 'observaciones' as const, label: 'Observaciones' },
  ]

  function updateRow(i: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()])
  }

  function removeRow(i: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
  }

  async function handleGuardar() {
    const rowsWithProduct = rows.filter((r) => r.producto_id > 0)
    const incomplete = rows.some((r) => r.producto_id <= 0 && (r.posologia.trim() || r.presentacion.trim()))
    if (incomplete) {
      toast.warning('Complete el medicamento en catálogo o vacíe los campos del renglón incompleto.')
      return
    }
    setSaving(true)
    try {
      const fechaPatch = fechaFormula.trim()
        ? `${fechaFormula.trim()}T12:00:00`
        : undefined
      await patchConsulta(consultaId, {
        diagnostico: diagnostico.trim() || null,
        observaciones: observaciones.trim() || null,
        fecha_consulta: fechaPatch ?? null,
      })

      const currentBackedIds = new Set(
        rows.filter((r) => r.formulaItemId != null).map((r) => r.formulaItemId!),
      )
      for (const id of snapshotItemIdsRef.current) {
        if (!currentBackedIds.has(id)) {
          await deleteFormulaItem(consultaId, id)
        }
      }

      for (const r of rowsWithProduct) {
        if (r.formulaItemId == null) {
          await addFormulaItem(consultaId, {
            producto_id: r.producto_id,
            presentacion: r.presentacion.trim() || undefined,
            observacion: r.posologia.trim() || undefined,
            cantidad: r.cantidad || 1,
          })
          continue
        }
        const snap = snapshotItemsRef.current.get(r.formulaItemId)
        if (!snap) {
          await addFormulaItem(consultaId, {
            producto_id: r.producto_id,
            presentacion: r.presentacion.trim() || undefined,
            observacion: r.posologia.trim() || undefined,
            cantidad: r.cantidad || 1,
          })
          continue
        }
        const changed =
          snap.producto_id !== r.producto_id ||
          snap.cantidad !== r.cantidad ||
          (snap.presentacion ?? '').trim() !== r.presentacion.trim() ||
          (snap.observacion ?? '').trim() !== r.posologia.trim()
        if (changed) {
          await deleteFormulaItem(consultaId, r.formulaItemId)
          await addFormulaItem(consultaId, {
            producto_id: r.producto_id,
            presentacion: r.presentacion.trim() || undefined,
            observacion: r.posologia.trim() || undefined,
            cantidad: r.cantidad || 1,
          })
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['consultas', 'mascota', mascotaId] })
      await queryClient.invalidateQueries({ queryKey: ['consultas', 'formula', consultaId] })
      await queryClient.invalidateQueries({ queryKey: ['consultas', 'detail', consultaId] })
      await queryClient.invalidateQueries({ queryKey: ['consultas', 'resumen', consultaId] })
      const huboMedicamentos = rowsWithProduct.length > 0
      const huboCambiosFormula =
        snapshotItemIdsRef.current.size > 0 ||
        rowsWithProduct.some((r) => r.formulaItemId == null) ||
        rowsWithProduct.some((r) => {
          if (r.formulaItemId == null) return false
          const snap = snapshotItemsRef.current.get(r.formulaItemId)
          if (!snap) return true
          return (
            snap.producto_id !== r.producto_id ||
            snap.cantidad !== r.cantidad ||
            (snap.presentacion ?? '').trim() !== r.presentacion.trim() ||
            (snap.observacion ?? '').trim() !== r.posologia.trim()
          )
        })
      toast.success(
        huboMedicamentos || huboCambiosFormula ? 'Fórmula médica guardada' : 'Datos de la consulta actualizados',
      )
      onAfterGuardado?.()
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar la fórmula.')
    } finally {
      setSaving(false)
    }
  }

  const titleBase =
    variant === 'edicion' ? `Editar fórmula médica — ${mascotaNombre}` : `Registro de fórmula médica — ${mascotaNombre}`

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      size="lg"
      panelClassName="max-w-lg max-h-[min(58vh,380px)]"
      scrollableBody={false}
      headerCloseStyle="icon"
      titleClassName="!text-xs sm:!text-sm"
      subtitle={
        pesoLabel ? (
          <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
            {pesoLabel}
          </span>
        ) : undefined
      }
      title={titleBase}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" size="sm" loading={saving} onClick={handleGuardar}>
            <Save className="mr-1 h-3.5 w-3.5" aria-hidden />
            Guardar
          </Button>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div
          role="tablist"
          aria-label="Secciones del formulario"
          className="flex shrink-0 flex-wrap gap-0.5 border-b border-slate-200 pb-1.5"
        >
          {tabDefs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                tab === t.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === 'datos' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Fecha fórmula
                </label>
                <input
                  type="date"
                  value={fechaFormula}
                  onChange={(e) => setFechaFormula(e.target.value)}
                  disabled={saving}
                  className="h-9 w-full max-w-[11rem] rounded-md border border-slate-300 px-2.5 text-sm"
                />
              </div>
              <div className="min-w-0 text-xs text-slate-500">
                {!pesoLabel ? <span className="text-slate-400">Peso disponible al cargar la mascota.</span> : null}
              </div>
            </div>
          )}

          {tab === 'diagnostico' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="min-w-0 md:col-span-2">
                <label className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Diagnóstico presuntivo y/o final
                </label>
                <textarea
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  rows={3}
                  disabled={saving}
                  className="w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {tab === 'medicamentos' && (
            <div className="flex h-full min-h-0 flex-col gap-2">
              <p className="text-[11px] text-slate-500">
                {variant === 'edicion' ? 'Medicamentos de la receta' : 'Añada uno o más medicamentos desde el catálogo.'}
              </p>
              {formulaLoading ? (
                <p className="text-sm text-slate-500">Cargando…</p>
              ) : formulaQuery.isError ? (
                <p className="text-sm text-red-600">No se pudo cargar la fórmula.</p>
              ) : (
                <>
                  <div className="min-h-0 max-h-[min(200px,30vh)] flex-1 space-y-1.5 overflow-y-auto pr-1">
                    {rows.map((row, i) => (
                      <MedicamentoRowEditor
                        key={row.key}
                        row={row}
                        disabled={saving || formulaLoading}
                        showRemove={rows.length > 1}
                        onUpdate={(patch) => updateRow(i, patch)}
                        onRemove={() => removeRow(i)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={addRow}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Agregar medicamento
                  </button>
                </>
              )}
            </div>
          )}

          {tab === 'observaciones' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="min-w-0 md:col-span-2">
                <label className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Observaciones clínicas{' '}
                  <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  placeholder="SOAP, notas adicionales…"
                  disabled={saving}
                  className="w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-xs leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
