import { useEffect, useMemo, useState } from 'react'
import { useConfigNotificaciones, usePatchConfigNotificaciones } from './hooks/useConfigNotificaciones'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { Switch } from '../../shared/ui/Switch'
import { PageHeader } from '../../shared/ui/PageHeader'
import { SettingsPanel } from '../../shared/ui/SettingsPanel'
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '../../shared/ui/Table'
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
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <PageHeader
        breadcrumbs={[{ label: 'Configuración' }, { label: 'Recordatorios' }]}
        title="Recordatorios de consultorio"
        subtitle={
          <>
            Define cuándo avisar al tutor antes de la cita y por qué medios. El cron{' '}
            <code className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
              POST /cron/recordatorios-citas
            </code>{' '}
            usa esta configuración. Variables:{' '}
            <code className="font-mono text-xs text-slate-700">{'{nombre_mascota}'}</code>,{' '}
            <code className="font-mono text-xs text-slate-700">{'{fecha}'}</code>,{' '}
            <code className="font-mono text-xs text-slate-700">{'{clinica}'}</code>,{' '}
            <code className="font-mono text-xs text-slate-700">{'{cliente}'}</code>.
          </>
        }
        badge={
          draft && draft.reglas_recordatorio.length > 0 ? (
            <span className="inline-flex items-center rounded-full border border-primary-200/90 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-900 shadow-sm">
              {draft.reglas_recordatorio.length}{' '}
              {draft.reglas_recordatorio.length === 1 ? 'regla activa' : 'reglas activas'}
            </span>
          ) : draft ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              Modo clásico
            </span>
          ) : undefined
        }
      />

      {isError && (
        <Alert variant="error">{error instanceof Error ? error.message : 'No se pudo cargar'}</Alert>
      )}
      {isLoading && <p className="text-sm text-slate-500">Cargando configuración…</p>}

      {draft && (
        <>
          <SettingsPanel
            kicker="Periodicidad"
            title="Reglas de envío"
            description="Cada fila es un recordatorio independiente: tiempo antes de la cita y canales (como en paneles tipo OkVet)."
            footer={
              <p>
                <strong className="text-slate-900">Ventana de disparo:</strong> el ancho en horas (siguiente bloque)
                define cuándo se dispara cada regla: la cita debe caer cerca de «valor × unidad» respecto a ahora, dentro
                de ± mitad de la ventana. Con reglas activas, el modo día calendario global no aplica a esos envíos.
              </p>
            }
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="mr-1 self-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Atajos
              </span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => addPreset(p.factory)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary-300 hover:bg-primary-50/90 hover:text-primary-900"
                >
                  + {p.label}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200/90 bg-slate-50/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  Tabla de reglas{' '}
                  <span className="font-normal text-slate-500">
                    ({draft.reglas_recordatorio.length}{' '}
                    {draft.reglas_recordatorio.length === 1 ? 'fila' : 'filas'})
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
                  + Nueva fila
                </Button>
              </div>

              {draft.reglas_recordatorio.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  Sin reglas personalizadas. Usa <strong>atajos</strong> o <strong>«Nueva fila»</strong>, o deja vacío para
                  usar el <strong>modo clásico</strong> más abajo.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-emerald-100/50 bg-white shadow-inner-soft ring-1 ring-emerald-50/30">
                  <Table plain className="w-full min-w-[720px] text-sm">
                    <TableHead>
                      <TableRow header>
                        <TableTh className="!px-3 !py-2.5 text-xs">#</TableTh>
                        <TableTh className="!px-3 !py-2.5 text-xs">Tiempo antes</TableTh>
                        <TableTh className="!px-3 !py-2.5 text-center text-xs">
                          <span className="inline-flex items-center justify-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                            Email
                          </span>
                        </TableTh>
                        <TableTh className="!px-3 !py-2.5 text-center text-xs">SMS</TableTh>
                        <TableTh className="!px-3 !py-2.5 text-center text-xs">WhatsApp</TableTh>
                        <TableTh className="w-28 !px-3 !py-2.5 text-right text-xs">Acciones</TableTh>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {draft.reglas_recordatorio.map((r, idx) => (
                        <TableRow
                          key={idx}
                          className={`transition-colors hover:bg-emerald-50/40 ${
                            !reglaTieneMedio(r) ? 'bg-amber-50/60' : idx % 2 === 1 ? 'bg-slate-50/30' : ''
                          }`}
                        >
                          <TableTd className="!px-3 !py-2.5 whitespace-nowrap text-slate-500">{idx + 1}</TableTd>
                          <TableTd className="!px-3 !py-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={8760}
                                value={r.valor}
                                onChange={(e) =>
                                  updateRegla(idx, { valor: Math.max(1, parseInt(e.target.value, 10) || 1) })
                                }
                                className="w-[4.5rem] rounded-md border border-slate-300 px-2 py-1.5 text-center text-sm tabular-nums shadow-sm"
                              />
                              <select
                                value={r.unidad}
                                onChange={(e) =>
                                  updateRegla(idx, { unidad: e.target.value as ReglaRecordatorioUnidad })
                                }
                                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm"
                              >
                                {UNIDADES.map((u) => (
                                  <option key={u.value} value={u.value}>
                                    {u.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-slate-600">antes</span>
                            </div>
                          </TableTd>
                          <TableTd className="!px-3 !py-2 text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={r.canal_email}
                                onChange={(v) => updateRegla(idx, { canal_email: v })}
                                aria-label={`Email regla ${idx + 1}`}
                              />
                            </div>
                          </TableTd>
                          <TableTd className="!px-3 !py-2 text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={r.canal_sms}
                                onChange={(v) => updateRegla(idx, { canal_sms: v })}
                                aria-label={`SMS regla ${idx + 1}`}
                              />
                            </div>
                          </TableTd>
                          <TableTd className="!px-3 !py-2 text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={r.canal_whatsapp}
                                onChange={(v) => updateRegla(idx, { canal_whatsapp: v })}
                                aria-label={`WhatsApp regla ${idx + 1}`}
                              />
                            </div>
                          </TableTd>
                          <TableTd className="!px-3 !py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                className="rounded-md p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800"
                                title="Duplicar"
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
                                className="rounded-md p-2 text-amber-700 transition hover:bg-amber-50"
                                title="Eliminar"
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
                          </TableTd>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </SettingsPanel>

          <SettingsPanel
            kicker="Automatización"
            title="Parámetros del cron"
            description="La ventana en horas aplica a las reglas y al modo clásico en ventana. El límite diario cuenta todos los recordatorios enviados por la empresa."
          >
            <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
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
                label="Máx. envíos / día (vacío = sin límite)"
                value={draft.max_envios_recordatorio_dia ?? ''}
                onChange={(e) => {
                  const v = e.target.value.trim()
                  setDraft((d) =>
                    d ? { ...d, max_envios_recordatorio_dia: v === '' ? null : parseInt(v, 10) || null } : d,
                  )
                }}
              />
            </div>
          </SettingsPanel>

          <SettingsPanel
            kicker="Respaldo"
            title="Programación clásica"
            description="Solo se usa si la tabla de reglas está vacía: día calendario o una ventana única con canales globales."
            muted={usaReglas}
            accent={!usaReglas}
          >
            <div className={`grid max-w-xl gap-4 ${usaReglas ? 'pointer-events-none opacity-60' : ''}`}>
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed"
                >
                  <option value="dia_calendario">Día calendario (objetivo por defecto: mañana)</option>
                  <option value="ventana_horas">Ventana en horas (recomendado con cron cada hora)</option>
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
          </SettingsPanel>

          <SettingsPanel
            kicker="Canales"
            title="Canales globales"
            description="Aplican únicamente en modo clásico (sin filas en la tabla)."
            muted={usaReglas}
            accent={!usaReglas}
          >
            <div className={`flex flex-wrap gap-8 ${usaReglas ? 'pointer-events-none opacity-60' : ''}`}>
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
          </SettingsPanel>

          <SettingsPanel kicker="Mensajes" title="Plantillas de texto" description="Mismo contenido base para todos los canales; email admite más formato.">
            <div className="grid max-w-2xl gap-4">
              <Input
                label="Asunto (email)"
                value={draft.plantilla_email_asunto}
                onChange={(e) => setDraft((d) => (d ? { ...d, plantilla_email_asunto: e.target.value } : d))}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Cuerpo email</label>
                <textarea
                  value={draft.plantilla_email_cuerpo}
                  onChange={(e) => setDraft((d) => (d ? { ...d, plantilla_email_cuerpo: e.target.value } : d))}
                  rows={8}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm"
                />
              </div>
              <Input
                label="Reply-To (opcional)"
                value={draft.reply_to_email ?? ''}
                onChange={(e) => setDraft((d) => (d ? { ...d, reply_to_email: e.target.value || null } : d))}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">SMS / WhatsApp</label>
                <textarea
                  value={draft.plantilla_sms_cuerpo}
                  onChange={(e) => setDraft((d) => (d ? { ...d, plantilla_sms_cuerpo: e.target.value } : d))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
                />
              </div>
            </div>
          </SettingsPanel>

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/90 bg-white/95 py-3 shadow-[0_-4px_20px_-2px_rgba(15,23,42,0.08)] backdrop-blur-md md:left-64">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 md:px-8">
              <Button onClick={handleSave} loading={mutation.isPending} className="min-w-[140px]">
                Guardar cambios
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!isDirty || mutation.isPending}
                onClick={handleDiscard}
              >
                Descartar
              </Button>
              {isDirty && (
                <span className="text-xs font-medium text-amber-800">Cambios sin guardar</span>
              )}
              <p className="text-xs text-slate-500 sm:ml-auto">
                Producción:{' '}
                <code className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[11px]">
                  NOTIFICATION_BACKEND=smtp
                </code>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
