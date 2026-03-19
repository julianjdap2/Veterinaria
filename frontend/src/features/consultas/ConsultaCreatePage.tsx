import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMascotas } from '../mascotas/hooks/useMascotas'
import { useMotivosConsulta } from '../catalogo/hooks/useMotivosConsulta'
import { useProductos } from '../productos/hooks/useProductos'
import { createConsultaConFormula } from './api'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import type { FormulaItemCreate } from '../../api/types'

type FormulaDraft = {
  producto_id: number
  presentacion: string
  observacion: string
  cantidad: number
  unidad?: string
  producto_nombre?: string
}

export function ConsultaCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const state = location.state as {
    mascotaId?: number
    motivoConsulta?: string
    citaId?: number
  } | null
  const mascotaIdFromState = state?.mascotaId
  const motivoFromState = state?.motivoConsulta ?? ''
  const citaIdFromState = state?.citaId
  const [mascotaId, setMascotaId] = useState(mascotaIdFromState?.toString() ?? '')
  const [motivoPredefinido, setMotivoPredefinido] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [tratamiento, setTratamiento] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fechaConsulta, setFechaConsulta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [formulaItems, setFormulaItems] = useState<FormulaDraft[]>([])
  const [formulaForm, setFormulaForm] = useState<FormulaDraft>({
    producto_id: 0,
    presentacion: '',
    observacion: '',
    cantidad: 1,
    unidad: undefined,
  })
  const [saving, setSaving] = useState(false)

  const { data: mascotasData } = useMascotas({ page: 1, page_size: 500, incluir_inactivos: false })
  const { data: motivosList = [] } = useMotivosConsulta()
  const { data: productosData } = useProductos(
    { page: 1, page_size: 500, incluir_inactivos: false },
    { enabled: true }
  )
  const mascotas = mascotasData?.items ?? []
  const productos = productosData?.items ?? []

  useEffect(() => {
    if (!motivoFromState || motivosList.length === 0) return
    const inList = motivosList.some((m) => m.nombre === motivoFromState)
    setMotivoPredefinido(inList ? motivoFromState : 'otro')
    setMotivoOtro(inList ? '' : motivoFromState)
  }, [motivoFromState, motivosList])

  function addFormulaRow() {
    if (!formulaForm.producto_id) return
    const p = productos.find((x) => x.id === formulaForm.producto_id)
    setFormulaItems((prev) => [
      ...prev,
      {
        ...formulaForm,
        producto_nombre: p?.nombre,
        presentacion: formulaForm.presentacion || p?.presentacion || '',
        unidad: p?.unidad ?? formulaForm.unidad,
      },
    ])
    setFormulaForm({
      producto_id: 0,
      presentacion: '',
      observacion: '',
      cantidad: 1,
      unidad: undefined,
    })
  }

  function removeFormulaRow(index: number) {
    setFormulaItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const mId = parseInt(mascotaId, 10)
    if (!mascotaId || Number.isNaN(mId)) {
      setError('Selecciona una mascota.')
      toast.warning('Selecciona una mascota.')
      return
    }
    const motivoFinal =
      motivoPredefinido === 'otro' ? motivoOtro.trim() : (motivoPredefinido || undefined)
    setSaving(true)
    try {
      // Si el usuario seleccionó un medicamento pero no presionó "Añadir",
      // todavía debemos persistir al menos 1 ítem para que aparezca en el detalle.
      const effectiveFormulaItems: FormulaDraft[] = [...formulaItems]
      if (
        effectiveFormulaItems.length === 0 &&
        formulaForm.producto_id &&
        formulaForm.producto_id > 0
      ) {
        const p = productos.find((x) => x.id === formulaForm.producto_id)
        effectiveFormulaItems.push({
          ...formulaForm,
          producto_nombre: p?.nombre,
          presentacion: formulaForm.presentacion || p?.presentacion || '',
          unidad: p?.unidad ?? formulaForm.unidad,
        })
      }

      const formula_items = effectiveFormulaItems.map((item) => ({
        producto_id: item.producto_id,
        presentacion: item.presentacion || undefined,
        observacion: item.observacion || undefined,
        cantidad: item.cantidad || 1,
      }))
      const data = await createConsultaConFormula({
        mascota_id: mId,
        motivo_consulta: motivoFinal,
        diagnostico: diagnostico.trim() || undefined,
        tratamiento: tratamiento.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        fecha_consulta: fechaConsulta ? `${fechaConsulta}T12:00:00` : undefined,
        cita_id: citaIdFromState ?? undefined,
        formula_items,
      })
      queryClient.invalidateQueries({ queryKey: ['consultas', 'mascota', data.mascota_id] })
      toast.success('Consulta registrada correctamente')
      navigate(`/mascotas/${data.mascota_id}`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al crear consulta.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nueva consulta (historial clínico)</h1>
        {citaIdFromState != null && (
          <Link
            to={`/citas/${citaIdFromState}`}
            className="text-sm text-primary-600 hover:underline"
          >
            ← Volver a la cita
          </Link>
        )}
      </div>
      <Card title="Datos de la consulta">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Mascota <span className="text-red-500">*</span>
              </label>
              <select
                value={mascotaId}
                onChange={(e) => setMascotaId(e.target.value)}
                required
                disabled={saving || !!mascotaIdFromState}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value="">Seleccionar mascota</option>
                {mascotas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Input
              type="date"
              label="Fecha de consulta"
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Motivo de consulta
            </label>
            <select
              value={motivoPredefinido}
              onChange={(e) => setMotivoPredefinido(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            >
              <option value="">Seleccionar motivo</option>
              {motivosList.map((m) => (
                <option key={m.id} value={m.nombre}>
                  {m.nombre}
                </option>
              ))}
              <option value="otro">Otro (especificar)</option>
            </select>
            {motivoPredefinido === 'otro' && (
              <Input
                className="mt-2"
                value={motivoOtro}
                onChange={(e) => setMotivoOtro(e.target.value)}
                placeholder="Indique el motivo..."
                disabled={saving}
              />
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Diagnóstico</label>
              <textarea
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                rows={3}
                placeholder="Diagnóstico"
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tratamiento</label>
              <textarea
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
                rows={3}
                placeholder="Tratamiento indicado"
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Notas adicionales"
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Medicamentos a recetar</h3>
            <p className="mb-3 text-sm text-slate-600">
              Añade los medicamentos que prescribirás en esta consulta. Aparecerán en el resumen/PDF y el recepcionista podrá registrar la venta desde la consulta.
            </p>
            <div className="mb-3 rounded-xl bg-slate-50 p-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Medicamento</label>
                  <select
                    value={formulaForm.producto_id || ''}
                    onChange={(e) =>
                      (() => {
                        const newId = parseInt(e.target.value, 10) || 0
                        const p = productos.find((x) => x.id === newId)
                        setFormulaForm((f) => ({
                          ...f,
                          producto_id: newId,
                          presentacion: p?.presentacion ?? '',
                          unidad: p?.unidad ?? undefined,
                        }))
                      })()
                    }
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                  >
                    <option value="">Seleccionar</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Presentación</label>
                  <input
                    type="text"
                    placeholder="Ej. 100mg x 30 comp"
                    value={formulaForm.presentacion ?? ''}
                    onChange={(e) => setFormulaForm((f) => ({ ...f, presentacion: e.target.value }))}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={formulaForm.cantidad ?? 1}
                    onChange={(e) =>
                      setFormulaForm((f) => ({ ...f, cantidad: parseInt(e.target.value, 10) || 1 }))
                    }
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addFormulaRow}
                    disabled={saving || !formulaForm.producto_id}
                  >
                    Añadir
                  </Button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Observación (cómo aplicar)</label>
                <input
                  type="text"
                  placeholder="Ej. 1 comprimido cada 12 h por 7 días"
                  value={formulaForm.observacion ?? ''}
                  onChange={(e) => setFormulaForm((f) => ({ ...f, observacion: e.target.value }))}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                />
              </div>
            </div>
            {formulaItems.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-3 py-2">Medicamento</th>
                      <th className="px-3 py-2">Presentación</th>
                      <th className="px-3 py-2 w-28">Unidad</th>
                      <th className="px-3 py-2 w-20">Cant.</th>
                      <th className="px-3 py-2">Observación</th>
                      <th className="w-14 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {formulaItems.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium">{row.producto_nombre ?? '—'}</td>
                        <td className="px-3 py-2">{row.presentacion ?? '—'}</td>
                        <td className="px-3 py-2">{row.unidad ?? '—'}</td>
                        <td className="px-3 py-2">{row.cantidad}</td>
                        <td className="px-3 py-2 max-w-[180px] truncate" title={row.observacion ?? ''}>
                          {row.observacion ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeFormulaRow(idx)}
                            disabled={saving}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={saving}>
              Guardar consulta
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
