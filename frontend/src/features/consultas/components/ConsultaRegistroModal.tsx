import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { Consulta } from '../../../api/types'
import { useMotivosConsulta } from '../../catalogo/hooks/useMotivosConsulta'
import { createConsultaConFormula } from '../api'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { Alert } from '../../../shared/ui/Alert'
import { toast } from '../../../core/toast-store'
import { ApiError } from '../../../api/errors'

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localDatetimeToIso(local: string): string | undefined {
  if (!local.trim()) return undefined
  const t = new Date(local)
  if (Number.isNaN(t.getTime())) return undefined
  return t.toISOString()
}

type Props = {
  open: boolean
  onClose: () => void
  mascotaId: number
  mascotaNombre: string
  /** Tras crear la consulta, abrir registro de fórmula (historia clínica). */
  onConsultaCreated?: (consulta: Consulta) => void
  /**
   * true = abierto desde «Nueva fórmula» en la ficha: mismo formulario SOAP (tipo Okvet),
   * título enfocado en fórmula y sin enlace al formulario largo de /consultas/nuevo.
   */
  flujoFormula?: boolean
}

export function ConsultaRegistroModal({
  open,
  onClose,
  mascotaId,
  mascotaNombre,
  onConsultaCreated,
  flujoFormula = false,
}: Props) {
  const queryClient = useQueryClient()
  const { data: motivosList = [] } = useMotivosConsulta()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fechaConsulta, setFechaConsulta] = useState('')
  const [motivoPredefinido, setMotivoPredefinido] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [subjetivo, setSubjetivo] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [planTerapeutico, setPlanTerapeutico] = useState('')
  const [planDiagnostico, setPlanDiagnostico] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    setFechaConsulta(toLocalDatetimeInput(new Date()))
    setMotivoPredefinido('')
    setMotivoOtro('')
    setSubjetivo('')
    setObjetivo('')
    setDiagnostico('')
    setPlanTerapeutico('')
    setPlanDiagnostico('')
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const motivoFinal =
      motivoPredefinido === 'otro' ? motivoOtro.trim() : motivoPredefinido.trim() || undefined
    if (!motivoFinal) {
      setError('Indique el motivo de la consulta.')
      return
    }
    const partesObs: string[] = []
    if (subjetivo.trim()) partesObs.push(`S — Subjetivo:\n${subjetivo.trim()}`)
    if (objetivo.trim()) partesObs.push(`O — Objetivo:\n${objetivo.trim()}`)
    const observaciones = partesObs.length > 0 ? partesObs.join('\n\n') : undefined
    let tratamiento = planTerapeutico.trim()
    if (planDiagnostico.trim()) {
      tratamiento = tratamiento
        ? `${tratamiento}\n\nP — Plan diagnóstico:\n${planDiagnostico.trim()}`
        : `P — Plan diagnóstico:\n${planDiagnostico.trim()}`
    }
    setSaving(true)
    try {
      const created = await createConsultaConFormula({
        mascota_id: mascotaId,
        motivo_consulta: motivoFinal,
        diagnostico: diagnostico.trim() || undefined,
        tratamiento: tratamiento || undefined,
        observaciones,
        fecha_consulta: localDatetimeToIso(fechaConsulta),
        formula_items: [],
        extras_clinicos: {
          hospitalizacion_id: undefined,
          vacuna_ids: [],
          pruebas_lab_ids: [],
          formato_documento_id: undefined,
        },
      })
      queryClient.invalidateQueries({ queryKey: ['consultas', 'mascota', mascotaId] })
      toast.success(
        flujoFormula
          ? 'Datos clínicos guardados. Ahora registre los medicamentos.'
          : 'Consulta registrada',
      )
      onClose()
      onConsultaCreated?.(created)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo guardar la consulta.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      size={flujoFormula ? 'wide' : '2xl'}
      title={
        flujoFormula
          ? `Nueva fórmula médica — ${mascotaNombre}`
          : `Registro de consulta — ${mascotaNombre}`
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          {flujoFormula
            ? 'Complete la consulta en formato SOAP (fecha, motivo, S, O, I, P). Al guardar se abrirá el registro de medicamentos sin precios.'
            : 'Formato clínico (SOAP) mapeado a motivo, observaciones y diagnóstico.'}
        </p>

        {error && (
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha y hora</label>
            <input
              type="datetime-local"
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Motivo <span className="text-red-500">*</span>
            </label>
            <select
              value={motivoPredefinido}
              onChange={(e) => setMotivoPredefinido(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            >
              <option value="">Seleccione una opción</option>
              {motivosList.map((m) => (
                <option key={m.id} value={m.nombre}>
                  {m.nombre}
                </option>
              ))}
              <option value="otro">Otro (especificar)</option>
            </select>
            {motivoPredefinido === 'otro' && (
              <input
                type="text"
                value={motivoOtro}
                onChange={(e) => setMotivoOtro(e.target.value)}
                placeholder="Motivo…"
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">S — Subjetivo (anamnesis)</label>
            <textarea
              value={subjetivo}
              onChange={(e) => setSubjetivo(e.target.value)}
              rows={4}
              placeholder="Subjetivo: motivo, historia…"
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">O — Objetivo (examen)</label>
            <textarea
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              rows={4}
              placeholder="Objetivo: hallazgos del examen físico…"
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">I — Interpretación (diagnóstico)</label>
          <textarea
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            rows={3}
            placeholder="Diagnóstico presuntivo, diferencial o final"
            disabled={saving}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">P — Plan terapéutico</label>
            <textarea
              value={planTerapeutico}
              onChange={(e) => setPlanTerapeutico(e.target.value)}
              rows={3}
              placeholder="Tratamiento y seguimiento"
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">P — Plan diagnóstico</label>
            <textarea
              value={planDiagnostico}
              onChange={(e) => setPlanDiagnostico(e.target.value)}
              rows={3}
              placeholder="Estudios o derivaciones pendientes"
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            />
          </div>
        </div>

        <details className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Examen físico (notas adicionales)</summary>
          <p className="mt-2 text-xs text-slate-500">
            Use los campos S y O arriba para el detalle; aquí puede ampliar si lo necesita en futuras versiones con
            secciones específicas.
          </p>
        </details>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {!flujoFormula ? (
            <Link
              to="/consultas/nuevo"
              state={{ mascotaId }}
              className="text-sm text-primary-600 hover:underline"
              onClick={() => !saving && onClose()}
            >
              Formulario completo (fórmula, productos…)
            </Link>
          ) : (
            <span className="hidden sm:block sm:min-w-[1px]" aria-hidden />
          )}
          <div className="flex flex-wrap justify-end gap-2 sm:ml-auto">
            <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
              Cerrar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
