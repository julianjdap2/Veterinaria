import { useState } from 'react'
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useConsultaDetail, useResumenConsulta, useFormula } from './hooks/useConsultaDetail'
import { downloadResumenPdf, enviarResumenEmail, addFormulaItem, deleteFormulaItem } from './api'
import { useProductos } from '../productos/hooks/useProductos'
import { useCitaDetail } from '../citas/hooks/useCitasAgenda'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import type { FormulaItemCreate } from '../../api/types'
import { PAGE_SIZE_SELECT, SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from '../../core/listDefaults'

const defaultFormulaForm: FormulaItemCreate = {
  producto_id: 0,
  presentacion: '',
  observacion: '',
  cantidad: 1,
}

export function ConsultaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const consultaId = id ? parseInt(id, 10) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const rolId = user?.rolId ?? 0
  const isVet = rolId === ROLES.VETERINARIO
  const puedeRegistrarVentaPorRol = rolId === ROLES.ADMIN || rolId === ROLES.RECEPCION

  const { data: consulta, isLoading, isError } = useConsultaDetail(consultaId)
  const { data: resumen, isLoading: loadingResumen } = useResumenConsulta(consultaId)
  const { data: formula = [], isLoading: loadingFormula } = useFormula(consultaId)
  const { data: citaDetalle } = useCitaDetail(consulta?.cita_id ?? null)
  const puedeRegistrarVenta =
    consulta?.cita_id == null ? puedeRegistrarVentaPorRol : citaDetalle?.estado === 'atendida' && puedeRegistrarVentaPorRol

  const [showAddForm, setShowAddForm] = useState(false)
  const [prodFilter, setProdFilter] = useState('')
  const debouncedProd = useDebouncedValue(prodFilter.trim(), SEARCH_DEBOUNCE_MS)
  const needProductos = isVet && (formula.length === 0 || showAddForm)
  const { data: productosData } = useProductos(
    {
      page: 1,
      page_size: PAGE_SIZE_SELECT,
      incluir_inactivos: false,
      search: debouncedProd.length >= SEARCH_MIN_CHARS ? debouncedProd : undefined,
    },
    { enabled: needProductos }
  )
  const productos = productosData?.items ?? []

  const [downloading, setDownloading] = useState(false)
  const [sending, setSending] = useState(false)
  const [formulaForm, setFormulaForm] = useState<FormulaItemCreate>(defaultFormulaForm)
  const [addingFormula, setAddingFormula] = useState(false)

  if (consultaId == null || isError || (!isLoading && !consulta)) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Consulta no encontrada.</p>
        <Link to="/mascotas" className="text-primary-600 hover:underline text-sm">
          ← Volver a mascotas
        </Link>
      </div>
    )
  }

  if (isLoading || !consulta) {
    return <p className="text-gray-500">Cargando...</p>
  }

  async function handleDescargarPdf() {
    if (consultaId == null) return
    setDownloading(true)
    try {
      await downloadResumenPdf(consultaId)
      toast.success('PDF descargado')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al descargar PDF.'
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  async function handleEnviarEmail() {
    if (consultaId == null) return
    setSending(true)
    try {
      await enviarResumenEmail(consultaId)
      toast.success('Resumen enviado por email al cliente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al enviar el email.'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  async function handleAddFormula(e: React.FormEvent) {
    e.preventDefault()
    if (consultaId == null || !formulaForm.producto_id) return
    setAddingFormula(true)
    try {
      await addFormulaItem(consultaId, {
        producto_id: formulaForm.producto_id,
        presentacion: formulaForm.presentacion || undefined,
        observacion: formulaForm.observacion || undefined,
        cantidad: formulaForm.cantidad || 1,
      })
      queryClient.invalidateQueries({ queryKey: ['consultas', 'formula', consultaId] })
      setFormulaForm(defaultFormulaForm)
      setShowAddForm(false)
      toast.success('Medicamento añadido a la fórmula')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al añadir')
    } finally {
      setAddingFormula(false)
    }
  }

  async function handleDeleteFormulaItem(itemId: number) {
    if (consultaId == null) return
    try {
      await deleteFormulaItem(consultaId, itemId)
      queryClient.invalidateQueries({ queryKey: ['consultas', 'formula', consultaId] })
      toast.success('Ítem quitado de la fórmula')
    } catch {
      toast.error('Error al quitar')
    }
  }

  function handleRegistrarVenta() {
    if (formula.length === 0) return
    navigate('/ventas/nueva', {
      state: {
        consultaId,
        formulaItems: formula.map((f) => ({
          producto_id: f.producto_id,
          cantidad: f.cantidad,
          precio_unitario: f.precio != null ? Number(f.precio) : undefined,
        })),
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/mascotas/${consulta.mascota_id}`}
          className="text-primary-600 hover:underline text-sm"
        >
          ← Volver a mascota
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Consulta #{consulta.id}</h1>

      <Card title="Datos de la consulta">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Mascota</dt>
            <dd className="mt-0.5">
              <Link
                to={`/mascotas/${consulta.mascota_id}`}
                className="text-primary-600 hover:underline"
              >
                {resumen?.mascota_nombre ?? `#${consulta.mascota_id}`}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Fecha</dt>
            <dd className="mt-0.5 text-gray-900">
              {resumen?.fecha_consulta ?? (consulta.fecha_consulta || consulta.created_at) ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Motivo</dt>
            <dd className="mt-0.5 text-gray-900">{consulta.motivo_consulta ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Diagnóstico</dt>
            <dd className="mt-0.5 text-gray-900">{consulta.diagnostico ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Tratamiento</dt>
            <dd className="mt-0.5 text-gray-900">{consulta.tratamiento ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Observaciones</dt>
            <dd className="mt-0.5 text-gray-900">{consulta.observaciones ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card
        title="Resumen de consulta"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={handleDescargarPdf}
              loading={downloading}
              disabled={loadingResumen}
            >
              Descargar PDF
            </Button>
            <Button
              variant="secondary"
              onClick={handleEnviarEmail}
              loading={sending}
              disabled={loadingResumen || !resumen?.cliente_email}
              title={
                !resumen?.cliente_email
                  ? 'El cliente no tiene email registrado'
                  : 'Envía el resumen al email del cliente'
              }
            >
              Enviar por email al cliente
            </Button>
          </div>
        }
      >
        {loadingResumen && <p className="text-sm text-gray-500">Cargando resumen...</p>}
        {!loadingResumen && resumen && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium text-gray-600">Cliente:</span>{' '}
              {resumen.cliente_nombre}
              {resumen.cliente_email && (
                <span className="text-gray-500"> ({resumen.cliente_email})</span>
              )}
            </p>
            <p>
              <span className="font-medium text-gray-600">Veterinario:</span>{' '}
              {resumen.veterinario_nombre}
            </p>
            <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
              <p><span className="font-medium text-gray-600">Motivo:</span> {resumen.motivo_consulta}</p>
              <p><span className="font-medium text-gray-600">Diagnóstico:</span> {resumen.diagnostico}</p>
              <p><span className="font-medium text-gray-600">Tratamiento:</span> {resumen.tratamiento}</p>
              <p><span className="font-medium text-gray-600">Notas de la cita:</span> {resumen.notas_cita}</p>
              <p><span className="font-medium text-gray-600">Observaciones:</span> {resumen.observaciones}</p>
            </div>
          </div>
        )}
      </Card>

      <Card title="Fórmula médica">
        {loadingFormula && <p className="text-sm text-gray-500">Cargando fórmula...</p>}
        {!loadingFormula && formula.length === 0 && !isVet && (
          <p className="text-sm text-gray-500">El veterinario no ha añadido medicamentos a la fórmula.</p>
        )}
        {!loadingFormula && formula.length === 0 && isVet && (
          <p className="text-sm text-gray-500">Añade medicamentos con presentación y observación de uso.</p>
        )}

        {isVet && formula.length > 0 && (
          <div className="mb-4">
            <Button variant="secondary" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? 'Ocultar' : 'Añadir otro medicamento'}
            </Button>
          </div>
        )}

        {isVet && (formula.length === 0 || showAddForm) && (
          <form onSubmit={handleAddFormula} className="mb-4 p-3 rounded-xl bg-slate-50 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Buscar medicamento</label>
              <input
                type="search"
                value={prodFilter}
                onChange={(e) => setProdFilter(e.target.value)}
                placeholder={`Opcional: refina con ${SEARCH_MIN_CHARS}+ caracteres (por defecto se listan ${PAGE_SIZE_SELECT})`}
                className="w-full max-w-lg rounded-xl border border-slate-300 px-3 py-2 text-sm"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Medicamento</label>
                <select
                  value={formulaForm.producto_id || ''}
                  onChange={(e) => {
                    const newId = parseInt(e.target.value, 10) || 0
                    const p = productos.find((x) => x.id === newId)
                    setFormulaForm((f) => ({
                      ...f,
                      producto_id: newId,
                      presentacion: p?.presentacion ?? f.presentacion,
                    }))
                  }}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Presentación"
                placeholder="Ej. 100mg x 30 comp"
                value={formulaForm.presentacion ?? ''}
                onChange={(e) => setFormulaForm((f) => ({ ...f, presentacion: e.target.value }))}
              />
              <Input
                type="number"
                min="1"
                label="Cantidad"
                value={formulaForm.cantidad ?? 1}
                onChange={(e) =>
                  setFormulaForm((f) => ({ ...f, cantidad: parseInt(e.target.value, 10) || 1 }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Observación (cómo aplicar)</label>
              <input
                type="text"
                placeholder="Ej. 1 comprimido cada 12 horas por 7 días"
                value={formulaForm.observacion ?? ''}
                onChange={(e) => setFormulaForm((f) => ({ ...f, observacion: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" loading={addingFormula} disabled={!formulaForm.producto_id}>
              Añadir a la fórmula
            </Button>
          </form>
        )}

        {formula.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-2 pr-4">Medicamento</th>
                  <th className="pb-2 pr-4">Presentación</th>
                  {puedeRegistrarVenta && <th className="pb-2 pr-4 w-24">Precio</th>}
                  <th className="pb-2 pr-4 w-20">Cant.</th>
                  <th className="pb-2 pr-4">Observación (cómo aplicar)</th>
                  {isVet && <th className="w-16" />}
                </tr>
              </thead>
              <tbody>
                {formula.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium">{f.producto_nombre ?? '—'}</td>
                    <td className="py-2 pr-4">{f.presentacion ?? '—'}</td>
                    {puedeRegistrarVenta && (
                      <td className="py-2 pr-4">
                        {f.precio != null ? Number(f.precio).toFixed(2) : '—'}
                      </td>
                    )}
                    <td className="py-2 pr-4">{f.cantidad}</td>
                    <td className="py-2 pr-4 max-w-[200px] truncate" title={f.observacion ?? ''}>
                      {f.observacion ?? '—'}
                    </td>
                    {isVet && (
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeleteFormulaItem(f.id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Quitar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {puedeRegistrarVenta && formula.length > 0 && (
          <div className="mt-4">
            <Button onClick={handleRegistrarVenta}>
              Registrar venta desde fórmula
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
