import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { Mascota } from '../../api/types'
import { MascotaSearchSelect } from '../mascotas/components/MascotaSearchSelect'
import { useMotivosConsulta } from '../catalogo/hooks/useMotivosConsulta'
import { createConsultaConFormula } from './api'
import { useVariablesClinicas } from '../empresa/hooks/useVariablesClinicas'
import { RegistroFormulaMedicaModal } from './components/RegistroFormulaMedicaModal'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

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
  const [mascotaId, setMascotaId] = useState<number | null>(mascotaIdFromState ?? null)
  const [motivoPredefinido, setMotivoPredefinido] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [tratamiento, setTratamiento] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fechaConsulta, setFechaConsulta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hospitalizacionId, setHospitalizacionId] = useState('')
  const [vacunaIds, setVacunaIds] = useState<string[]>([])
  const [pruebasLabIds, setPruebasLabIds] = useState<string[]>([])
  const [formatoDocumentoId, setFormatoDocumentoId] = useState('')
  const [formulaModal, setFormulaModal] = useState<{
    consultaId: number
    mascotaId: number
    mascotaNombre: string
    diagnostico: string
    observaciones: string
    fechaConsultaIso: string | null
  } | null>(null)

  const { data: motivosList = [] } = useMotivosConsulta()
  const { data: variablesClinicas } = useVariablesClinicas()

  useEffect(() => {
    if (!motivoFromState || motivosList.length === 0) return
    const inList = motivosList.some((m) => m.nombre === motivoFromState)
    setMotivoPredefinido(inList ? motivoFromState : 'otro')
    setMotivoOtro(inList ? '' : motivoFromState)
  }, [motivoFromState, motivosList])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const mId = mascotaId
    if (mId == null || mId <= 0) {
      setError('Selecciona una mascota.')
      toast.warning('Selecciona una mascota.')
      return
    }
    const motivoFinal =
      motivoPredefinido === 'otro' ? motivoOtro.trim() : (motivoPredefinido || undefined)
    setSaving(true)
    try {
      const fechaIso = fechaConsulta ? `${fechaConsulta}T12:00:00` : undefined
      const data = await createConsultaConFormula({
        mascota_id: mId,
        motivo_consulta: motivoFinal,
        diagnostico: diagnostico.trim() || undefined,
        tratamiento: tratamiento.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        fecha_consulta: fechaIso,
        cita_id: citaIdFromState ?? undefined,
        extras_clinicos: {
          hospitalizacion_id: hospitalizacionId || undefined,
          vacuna_ids: vacunaIds,
          pruebas_lab_ids: pruebasLabIds,
          formato_documento_id: formatoDocumentoId || undefined,
        },
        formula_items: [],
      })
      queryClient.invalidateQueries({ queryKey: ['consultas', 'mascota', data.mascota_id] })
      toast.success('Consulta registrada correctamente')
      const mascotaNombre =
        (queryClient.getQueryData(['mascotas', 'detail', mId]) as Mascota | undefined)?.nombre ??
        `Mascota #${mId}`
      setFormulaModal({
        consultaId: data.id,
        mascotaId: data.mascota_id,
        mascotaNombre,
        diagnostico: diagnostico.trim(),
        observaciones: observaciones.trim(),
        fechaConsultaIso: data.fecha_consulta ?? fechaIso ?? null,
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al crear consulta.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  function closeFormulaModalAndLeave() {
    const mId = formulaModal?.mascotaId
    setFormulaModal(null)
    if (mId != null) navigate(`/mascotas/${mId}`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Inicio', to: '/dashboard' }, { label: 'Nueva consulta' }]}
        title="Nueva consulta"
        subtitle="Historial clínico: motivo, diagnóstico y datos clínicos. La fórmula médica se registra al guardar."
        actions={
          citaIdFromState != null ? (
            <Link
              to={`/citas/${citaIdFromState}`}
              className="text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              ← Volver a la cita
            </Link>
          ) : undefined
        }
      />
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
              <MascotaSearchSelect
                value={mascotaId}
                onChange={setMascotaId}
                disabled={saving || !!mascotaIdFromState || formulaModal != null}
              />
            </div>
            <Input
              type="date"
              label="Fecha de consulta"
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              disabled={saving || formulaModal != null}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Motivo de consulta
            </label>
            <select
              value={motivoPredefinido}
              onChange={(e) => setMotivoPredefinido(e.target.value)}
              disabled={saving || formulaModal != null}
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
                disabled={saving || formulaModal != null}
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
                disabled={saving || formulaModal != null}
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
                disabled={saving || formulaModal != null}
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
              disabled={saving || formulaModal != null}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Hospitalización / ingreso</label>
              <select
                value={hospitalizacionId}
                onChange={(e) => setHospitalizacionId(e.target.value)}
                disabled={saving || formulaModal != null}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value="">No aplica</option>
                {(variablesClinicas?.hospitalizacion ?? []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Formato de documento</label>
              <select
                value={formatoDocumentoId}
                onChange={(e) => setFormatoDocumentoId(e.target.value)}
                disabled={saving || formulaModal != null}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value="">Sin formato</option>
                {(variablesClinicas?.formatos_documento ?? []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Vacunas (múltiple)</label>
              <select
                multiple
                value={vacunaIds}
                onChange={(e) => setVacunaIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                disabled={saving || formulaModal != null}
                className="min-h-28 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                {(variablesClinicas?.vacunas ?? []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Pruebas de laboratorio</label>
              <select
                multiple
                value={pruebasLabIds}
                onChange={(e) => setPruebasLabIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                disabled={saving || formulaModal != null}
                className="min-h-28 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                {(variablesClinicas?.pruebas_laboratorio ?? []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={saving} disabled={formulaModal != null}>
              Guardar consulta
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={saving || formulaModal != null}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>

      {formulaModal != null && (
        <RegistroFormulaMedicaModal
          open
          onClose={closeFormulaModalAndLeave}
          consultaId={formulaModal.consultaId}
          mascotaId={formulaModal.mascotaId}
          mascotaNombre={formulaModal.mascotaNombre}
          diagnosticoInicial={formulaModal.diagnostico}
          observacionesInicial={formulaModal.observaciones}
          fechaConsultaIso={formulaModal.fechaConsultaIso}
        />
      )}
    </div>
  )
}
