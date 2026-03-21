import { useEffect, useState } from 'react'
import { useConfigNotificaciones, usePatchConfigNotificaciones } from './hooks/useConfigNotificaciones'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import type { NotificacionesConfig, RecordatorioModo } from '../../api/types'

function draftFrom(d: NotificacionesConfig) {
  return { ...d }
}

export function NotificacionesConfigPage() {
  const { data, isLoading, isError, error } = useConfigNotificaciones()
  const mutation = usePatchConfigNotificaciones()
  const [draft, setDraft] = useState<NotificacionesConfig | null>(null)

  useEffect(() => {
    if (data) setDraft(draftFrom(data))
  }, [data])

  async function handleSave() {
    if (!draft) return
    try {
      await mutation.mutateAsync({
        recordatorio_modo: draft.recordatorio_modo,
        recordatorio_horas_antes: draft.recordatorio_horas_antes,
        recordatorio_ventana_horas: draft.recordatorio_ventana_horas,
        canal_email: draft.canal_email,
        canal_sms: draft.canal_sms,
        canal_whatsapp: draft.canal_whatsapp,
        plantilla_email_asunto: draft.plantilla_email_asunto,
        plantilla_email_cuerpo: draft.plantilla_email_cuerpo,
        plantilla_sms_cuerpo: draft.plantilla_sms_cuerpo,
        max_envios_recordatorio_dia: draft.max_envios_recordatorio_dia,
        reply_to_email: draft.reply_to_email?.trim() || null,
      })
      toast.success('Notificaciones guardadas')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al guardar')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Notificaciones (recordatorios)</h1>
      <p className="text-sm text-slate-600 max-w-3xl">
        El cron <code className="text-xs bg-slate-100 px-1 rounded">POST /cron/recordatorios-citas</code> usa esta
        configuración. Variables en plantillas:{' '}
        <code className="text-xs">{'{nombre_mascota}'}</code>, <code className="text-xs">{'{fecha}'}</code>,{' '}
        <code className="text-xs">{'{clinica}'}</code>, <code className="text-xs">{'{cliente}'}</code>. El envío real
        de email depende de <code className="text-xs">NOTIFICATION_BACKEND=smtp</code> en el servidor.
      </p>

      {isError && (
        <Alert variant="error">
          {error instanceof Error ? error.message : 'No se pudo cargar'}
        </Alert>
      )}
      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}

      {draft && (
        <>
          <Card title="Programación">
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Modo</label>
                <select
                  value={draft.recordatorio_modo}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, recordatorio_modo: e.target.value as RecordatorioModo } : d,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="dia_calendario">
                    Día calendario (citas del día objetivo; por defecto mañana al llamar al cron)
                  </option>
                  <option value="ventana_horas">
                    Ventana en horas (recomendado si el cron corre cada hora)
                  </option>
                </select>
              </div>
              <Input
                type="number"
                label="Horas antes de la cita (modo ventana)"
                value={String(draft.recordatorio_horas_antes)}
                min={1}
                max={168}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, recordatorio_horas_antes: parseInt(e.target.value, 10) || 24 } : d,
                  )
                }
              />
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
              <p className="text-xs text-slate-500">
                En modo ventana se envía si la cita cae aproximadamente a{' '}
                <strong>H</strong> horas de ahora (± ventana/2). Ej.: H=24 y ventana=6 → entre 21h y 27h.
              </p>
              <Input
                type="number"
                label="Máx. envíos recordatorio / día (empresa, vacío = sin límite)"
                value={draft.max_envios_recordatorio_dia ?? ''}
                onChange={(e) => {
                  const v = e.target.value.trim()
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          max_envios_recordatorio_dia: v === '' ? null : parseInt(v, 10) || null,
                        }
                      : d,
                  )
                }}
              />
            </div>
          </Card>

          <Card title="Canales">
            <div className="flex flex-col gap-3 max-w-md">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.canal_email}
                  onChange={(e) => setDraft((d) => (d ? { ...d, canal_email: e.target.checked } : d))}
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.canal_whatsapp}
                  onChange={(e) => setDraft((d) => (d ? { ...d, canal_whatsapp: e.target.checked } : d))}
                />
                WhatsApp (requiere módulo en plan + Twilio en servidor)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.canal_sms}
                  onChange={(e) => setDraft((d) => (d ? { ...d, canal_sms: e.target.checked } : d))}
                />
                SMS (mismo requisito Twilio que WhatsApp en este proyecto)
              </label>
            </div>
          </Card>

          <Card title="Plantillas email">
            <div className="space-y-3 max-w-2xl">
              <Input
                label="Asunto"
                value={draft.plantilla_email_asunto}
                onChange={(e) => setDraft((d) => (d ? { ...d, plantilla_email_asunto: e.target.value } : d))}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Cuerpo</label>
                <textarea
                  value={draft.plantilla_email_cuerpo}
                  onChange={(e) => setDraft((d) => (d ? { ...d, plantilla_email_cuerpo: e.target.value } : d))}
                  rows={8}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <Input
                label="Reply-To (email de la clínica, opcional)"
                value={draft.reply_to_email ?? ''}
                onChange={(e) => setDraft((d) => (d ? { ...d, reply_to_email: e.target.value || null } : d))}
              />
            </div>
          </Card>

          <Card title="Plantilla SMS / WhatsApp (texto corto)">
            <textarea
              value={draft.plantilla_sms_cuerpo}
              onChange={(e) => setDraft((d) => (d ? { ...d, plantilla_sms_cuerpo: e.target.value } : d))}
              rows={3}
              className="w-full max-w-2xl rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </Card>

          <Button onClick={handleSave} loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      )}
    </div>
  )
}
