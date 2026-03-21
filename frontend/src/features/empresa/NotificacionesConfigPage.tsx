import { useEffect, useMemo, useState } from 'react'
import { useConfigNotificaciones, usePatchConfigNotificaciones } from './hooks/useConfigNotificaciones'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { Switch } from '../../shared/ui/Switch'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import type { NotificacionesConfig, ReglaRecordatorio, ReglaRecordatorioUnidad } from '../../api/types'

function draftFrom(d: NotificacionesConfig): NotificacionesConfig {
  return {
    ...d,
    reglas_recordatorio: Array.isArray(d.reglas_recordatorio) ? d.reglas_recordatorio : [],
  }
}

function snapshot(c: NotificacionesConfig): string {
  return JSON.stringify({
    recordatorio_modo: c.recordatorio_modo,
    recordatorio_horas_antes: c.recordatorio_horas_antes,
    recordatorio_ventana_horas: c.recordatorio_ventana_horas,
    canal_email: c.canal_email,
    canal_sms: c.canal_sms,
    canal_whatsapp: c.canal_whatsapp,
    reglas_recordatorio: c.reglas_recordatorio,
    plantilla_email_asunto: c.plantilla_email_asunto,
    plantilla_email_cuerpo: c.plantilla_email_cuerpo,
    plantilla_sms_cuerpo: c.plantilla_sms_cuerpo,
    max_envios_recordatorio_dia: c.max_envios_recordatorio_dia,
    reply_to_email: c.reply_to_email,
  })
}

function reglaTieneMedio(r: ReglaRecordatorio): boolean {
  return r.canal_email || r.canal_sms || r.canal_whatsapp
}

const UNIDADES: { value: ReglaRecordatorioUnidad; label: string }[] = [
  { value: 'horas', label: 'Horas' },
  { value: 'dias', label: 'Días' },
  { value: 'semanas', label: 'Semanas' },
]

function nuevaRegla(overrides?: Partial<ReglaRecordatorio>): ReglaRecordatorio {
  return {
    valor: 1,
    unidad: 'dias',
    canal_email: true,
    canal_sms: false,
    canal_whatsapp: false,
    ...overrides,
  }
}

/** Atajos para añadir filas típicas (1 semana, 3 días, 24 h, etc.) */
const PRESETS: { label: string; factory: () => ReglaRecordatorio }[] = [
  { label: '1 semana · email', factory: () => nuevaRegla({ valor: 1, unidad: 'semanas', canal_email: true }) },
  { label: '3 días · email', factory: () => nuevaRegla({ valor: 3, unidad: 'dias', canal_email: true }) },
  { label: '1 día · WhatsApp', factory: () =>
      nuevaRegla({ valor: 1, unidad: 'dias', canal_email: false, canal_whatsapp: true }),
  },
  { label: '24 h · SMS', factory: () =>
      nuevaRegla({ valor: 24, unidad: 'horas', canal_email: false, canal_sms: true }),
  },
]

export function NotificacionesConfigPage() {
  const { data, isLoading, isError, error } = useConfigNotificaciones()
  const mutation = usePatchConfigNotificaciones()
  const [draft, setDraft] = useState<NotificacionesConfig | null>(null)

  useEffect(() => {
    if (data) setDraft(draftFrom(data))
  }, [data])

  const usaReglas = (draft?.reglas_recordatorio?.length ?? 0) > 0

  const isDirty = useMemo(() => {
    if (!data || !draft) return false
    return snapshot(draft) !== snapshot(draftFrom(data))
  }, [data, draft])

  function handleDiscard() {
    if (data) setDraft(draftFrom(data))
  }

  function validateBeforeSave(d: NotificacionesConfig): string | null {
    if (d.reglas_recordatorio.length > 0) {
      const vacías = d.reglas_recordatorio
        .map((r, i) => (!reglaTieneMedio(r) ? i + 1 : null))
        .filter((x): x is number => x != null)
      if (vacías.length) {
        return `La regla ${vacías.join(', ')} no tiene ningún medio activo. Activa al menos uno por fila.`
      }
    } else {
      if (!d.canal_email && !d.canal_sms && !d.canal_whatsapp) {
        return 'En modo clásico debes activar al menos un canal global (email, SMS o WhatsApp).'
      }
    }
    return null
  }

  async function handleSave() {
    if (!draft) return
    const err = validateBeforeSave(draft)
    if (err) {
      toast.error(err)
      return
    }
    try {
      await mutation.mutateAsync({
        recordatorio_modo: draft.recordatorio_modo,
        recordatorio_horas_antes: draft.recordatorio_horas_antes,
        recordatorio_ventana_horas: draft.recordatorio_ventana_horas,
        canal_email: draft.canal_email,
        canal_sms: draft.canal_sms,
        canal_whatsapp: draft.canal_whatsapp,
        reglas_recordatorio: draft.reglas_recordatorio,
        plantilla_email_asunto: draft.plantilla_email_asunto,
        plantilla_email_cuerpo: draft.plantilla_email_cuerpo,
        plantilla_sms_cuerpo: draft.plantilla_sms_cuerpo,
        max_envios_recordatorio_dia: draft.max_envios_recordatorio_dia,
        reply_to_email: draft.reply_to_email?.trim() || null,
      })
      toast.success('Configuración guardada')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al guardar')
    }
  }

  function updateRegla(index: number, patch: Partial<ReglaRecordatorio>) {
    setDraft((d) => {
      if (!d) return d
      const next = [...d.reglas_recordatorio]
      next[index] = { ...next[index], ...patch }
      return { ...d, reglas_recordatorio: next }
    })
  }

  function removeRegla(index: number) {
    setDraft((d) => {
      if (!d) return d
      return { ...d, reglas_recordatorio: d.reglas_recordatorio.filter((_, i) => i !== index) }
    })
  }

  function duplicateRegla(index: number) {
    setDraft((d) => {
      if (!d) return d
      const copy = { ...d.reglas_recordatorio[index] }
      const next = [...d.reglas_recordatorio]
      next.splice(index + 1, 0, copy)
      return { ...d, reglas_recordatorio: next }
    })
  }

  function addPreset(factory: () => ReglaRecordatorio) {
    setDraft((d) => (d ? { ...d, reglas_recordatorio: [...d.reglas_recordatorio, factory()] } : d))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <div className="border-b border-slate-200/80 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Configuración</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Recordatorios de consultorio</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Define cuándo avisar al tutor antes de la cita y por qué medios. El cron{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">POST /cron/recordatorios-citas</code>{' '}
          usa esta configuración. Variables en plantillas:{' '}
          <code className="text-xs">{'{nombre_mascota}'}</code>, <code className="text-xs">{'{fecha}'}</code>,{' '}
          <code className="text-xs">{'{clinica}'}</code>, <code className="text-xs">{'{cliente}'}</code>.
        </p>
      </div>

      {isError && (
        <Alert variant="error">{error instanceof Error ? error.message : 'No se pudo cargar'}</Alert>
      )}
      {isLoading && <p className="text-sm text-slate-500">Cargando configuración…</p>}

      {draft && (
        <>
          {/* Tabla de reglas */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Periodicidad y medios de envío</h2>
            <p className="mt-1 text-sm text-slate-600">
              Una fila = un recordatorio: <strong className="text-slate-800">cuánto antes</strong> de la cita y qué
              canales usar. Puedes combinar varias (p. ej. 1 semana por email y 1 día por WhatsApp).
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="mr-1 self-center text-xs font-medium uppercase tracking-wide text-slate-500">
                Atajos:
              </span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => addPreset(p.factory)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary-300 hover:bg-primary-50/80 hover:text-primary-900"
                >
                  + {p.label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-slate-50/80 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  Reglas activas{' '}
                  <span className="font-normal text-slate-500">
                    ({draft.reglas_recordatorio.length}{' '}
                    {draft.reglas_recordatorio.length === 1 ? 'regla' : 'reglas'})
                  </span>
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setDraft((d) =>
                      d ? { ...d, reglas_recordatorio: [...d.reglas_recordatorio, nuevaRegla()] } : d,
                    )
                  }
                >
                  + Agregar regla vacía
                </Button>
              </div>

              {draft.reglas_recordatorio.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No hay reglas personalizadas. Usa los <strong>atajos</strong>, <strong>«Agregar regla vacía»</strong> o
                  deja la tabla vacía para el <strong>modo clásico</strong> (abajo).
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-inner-soft">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Antes de la cita</th>
                        <th className="px-4 py-3 text-center">Email</th>
                        <th className="px-4 py-3 text-center">SMS</th>
                        <th className="px-4 py-3 text-center">WhatsApp</th>
                        <th className="px-4 py-3 w-28 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {draft.reglas_recordatorio.map((r, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors hover:bg-slate-50/60 ${
                            !reglaTieneMedio(r) ? 'bg-amber-50/50 ring-1 ring-inset ring-amber-200/80' : ''
                          }`}
                        >
                          <td className="px-4 py-3 align-middle text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={8760}
                                value={r.valor}
                                onChange={(e) =>
                                  updateRegla(idx, { valor: Math.max(1, parseInt(e.target.value, 10) || 1) })
                                }
                                className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-center tabular-nums shadow-sm"
                              />
                              <select
                                value={r.unidad}
                                onChange={(e) =>
                                  updateRegla(idx, { unidad: e.target.value as ReglaRecordatorioUnidad })
                                }
                                className="rounded-lg border border-slate-300 px-2 py-1.5 shadow-sm"
                              >
                                {UNIDADES.map((u) => (
                                  <option key={u.value} value={u.value}>
                                    {u.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-slate-600">antes</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            <div className="flex justify-center">
                              <Switch
                                checked={r.canal_email}
                                onChange={(v) => updateRegla(idx, { canal_email: v })}
                                aria-label={`Email regla ${idx + 1}`}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            <div className="flex justify-center">
                              <Switch
                                checked={r.canal_sms}
                                onChange={(v) => updateRegla(idx, { canal_sms: v })}
                                aria-label={`SMS regla ${idx + 1}`}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            <div className="flex justify-center">
                              <Switch
                                checked={r.canal_whatsapp}
                                onChange={(v) => updateRegla(idx, { canal_whatsapp: v })}
                                aria-label={`WhatsApp regla ${idx + 1}`}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right align-middle">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary-700"
                                title="Duplicar regla"
                                onClick={() => duplicateRegla(idx)}
                              >
                                <span className="sr-only">Duplicar</span>
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50"
                                title="Quitar regla"
                                onClick={() => removeRegla(idx)}
                              >
                                <span className="sr-only">Eliminar</span>
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/40 px-4 py-3 text-sm text-slate-700">
              <strong className="text-primary-900">Ventana de disparo:</strong> el ancho en horas (bloque siguiente)
              define cuándo “cae” cada regla: la cita debe estar aproximadamente a «valor × unidad» de ahora, dentro de
              ± mitad de esa ventana. Con reglas activas, el modo “día calendario” global no aplica a esos envíos.
            </div>
          </section>

          {/* Parámetros del cron — siempre visibles */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Parámetros del cron</h2>
            <p className="mt-1 text-sm text-slate-600">
              La <strong>ventana</strong> afecta tanto a las <strong>reglas</strong> como al modo clásico en ventana. El
              límite diario cuenta todos los envíos de recordatorio de la empresa.
            </p>
            <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
              <Input
                type="number"
                label="Ancho de ventana (horas)"
                value={String(draft.recordatorio_ventana_horas)}
                min={1}
                max={48}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, recordatorio_ventana_horas: parseInt(e.target.value, 10) || 6 } : d,
                  )
                }
              />
              <Input
                type="number"
                label="Máx. envíos recordatorio / día (vacío = sin límite)"
                value={draft.max_envios_recordatorio_dia ?? ''}
                onChange={(e) => {
                  const v = e.target.value.trim()
                  setDraft((d) =>
                    d ? { ...d, max_envios_recordatorio_dia: v === '' ? null : parseInt(v, 10) || null } : d,
                  )
                }}
              />
            </div>
          </section>

          {/* Modo clásico */}
          <section
            className={`rounded-2xl border p-6 shadow-sm ${
              usaReglas ? 'border-slate-100 bg-slate-50/50 opacity-80' : 'border-slate-200/90 bg-white'
            }`}
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Programación clásica {usaReglas ? '(solo si no hay reglas en la tabla)' : ''}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Si la tabla de reglas está <strong>vacía</strong>, se usa este bloque: día calendario o una sola ventana en
              horas con los canales globales.
            </p>
            <div className="mt-4 grid max-w-xl gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Modo</label>
                <select
                  value={draft.recordatorio_modo}
                  disabled={usaReglas}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, recordatorio_modo: e.target.value as NotificacionesConfig['recordatorio_modo'] } : d,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed"
                >
                  <option value="dia_calendario">Día calendario (citas del día objetivo; por defecto mañana)</option>
                  <option value="ventana_horas">Ventana en horas (recomendado si el cron corre cada hora)</option>
                </select>
              </div>
              <Input
                type="number"
                label="Horas antes de la cita (modo ventana)"
                value={String(draft.recordatorio_horas_antes)}
                min={1}
                max={168}
                disabled={usaReglas}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, recordatorio_horas_antes: parseInt(e.target.value, 10) || 24 } : d,
                  )
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Canales globales (modo clásico)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Solo aplican cuando <strong>no</strong> hay filas en la tabla de reglas.
            </p>
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                <Switch
                  checked={draft.canal_email}
                  disabled={usaReglas}
                  onChange={(v) => setDraft((d) => (d ? { ...d, canal_email: v } : d))}
                  aria-label="Email global"
                />
                Email
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                <Switch
                  checked={draft.canal_whatsapp}
                  disabled={usaReglas}
                  onChange={(v) => setDraft((d) => (d ? { ...d, canal_whatsapp: v } : d))}
                  aria-label="WhatsApp global"
                />
                WhatsApp
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                <Switch
                  checked={draft.canal_sms}
                  disabled={usaReglas}
                  onChange={(v) => setDraft((d) => (d ? { ...d, canal_sms: v } : d))}
                  aria-label="SMS global"
                />
                SMS
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Plantillas</h2>
            <div className="mt-4 grid max-w-2xl gap-4">
              <Input
                label="Asunto email"
                value={draft.plantilla_email_asunto}
                onChange={(e) => setDraft((d) => (d ? { ...d, plantilla_email_asunto: e.target.value } : d))}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Cuerpo email</label>
                <textarea
                  value={draft.plantilla_email_cuerpo}
                  onChange={(e) => setDraft((d) => (d ? { ...d, plantilla_email_cuerpo: e.target.value } : d))}
                  rows={8}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <Input
                label="Reply-To (opcional)"
                value={draft.reply_to_email ?? ''}
                onChange={(e) => setDraft((d) => (d ? { ...d, reply_to_email: e.target.value || null } : d))}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">SMS / WhatsApp (texto corto)</label>
                <textarea
                  value={draft.plantilla_sms_cuerpo}
                  onChange={(e) => setDraft((d) => (d ? { ...d, plantilla_sms_cuerpo: e.target.value } : d))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <Button onClick={handleSave} loading={mutation.isPending} className="min-w-[140px]">
              Guardar cambios
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!isDirty || mutation.isPending}
              onClick={handleDiscard}
            >
              Descartar cambios
            </Button>
            {isDirty && <span className="text-xs font-medium text-amber-700">Tienes cambios sin guardar</span>}
            <p className="text-xs text-slate-500 sm:ml-auto">
              Email real: <code className="rounded bg-slate-100 px-1">NOTIFICATION_BACKEND=smtp</code>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
