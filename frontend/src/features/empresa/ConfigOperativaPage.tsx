import { useEffect, useState } from 'react'
import { useConfigOperativa, usePatchConfigOperativa } from './hooks/useConfigOperativa'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { SettingsPanel } from '../../shared/ui/SettingsPanel'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import type { TipoServicioCita } from '../../api/types'
import { ApiError } from '../../api/errors'

export function ConfigOperativaPage() {
  const { data, isLoading, isError, error } = useConfigOperativa()
  const mutation = usePatchConfigOperativa()
  const [tiposJson, setTiposJson] = useState('')
  const [prefijo, setPrefijo] = useState('V-')
  const [padding, setPadding] = useState(6)
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setPrefijo(data.venta_prefijo)
    setPadding(data.venta_numero_padding)
    setTiposJson(JSON.stringify(data.tipos_servicio, null, 2))
  }, [data])

  function parseTipos(): TipoServicioCita[] | null {
    setParseError(null)
    try {
      const raw = JSON.parse(tiposJson) as unknown
      if (!Array.isArray(raw) || raw.length === 0) {
        setParseError('Debe ser un array JSON con al menos un tipo.')
        return null
      }
      return raw.map((x) => {
        const o = x as Record<string, unknown>
        return {
          id: String(o.id ?? ''),
          label: String(o.label ?? ''),
          duracion_min: Number(o.duracion_min ?? 30),
          allow_urgente: Boolean(o.allow_urgente),
          allow_recurrente: Boolean(o.allow_recurrente),
          categoria: String(o.categoria ?? 'general'),
        }
      }) as TipoServicioCita[]
    } catch {
      setParseError('JSON inválido.')
      return null
    }
  }

  async function handleSave() {
    const tipos = parseTipos()
    if (!tipos) return
    try {
      await mutation.mutateAsync({
        tipos_servicio: tipos,
        venta_prefijo: prefijo.trim() || undefined,
        venta_numero_padding: padding,
      })
      toast.success('Configuración guardada')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Error al guardar'
      toast.error(msg)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Configuración' }, { label: 'Operativa' }]}
        title="Configuración operativa"
        subtitle={
          <>
            Tipos de servicio para citas (motivo guardado ={' '}
            <code className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-xs">id</code>
            ), duración orientativa y permiso de urgente. Numeración interna de ventas (no fiscal).
          </>
        }
      />

      {isError && (
        <Alert variant="error">
          {error instanceof Error ? error.message : 'No se pudo cargar la configuración'}
        </Alert>
      )}

      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}

      {data && (
        <SettingsPanel
          kicker="Agenda"
          title="Tipos de servicio (JSON)"
          description="Define motivos, duración y flags; el id es el valor que se guarda en cada cita."
        >
          <div className="max-w-4xl space-y-4">
            {parseError && (
              <Alert variant="error" onDismiss={() => setParseError(null)}>
                {parseError}
              </Alert>
            )}
            <textarea
              value={tiposJson}
              onChange={(e) => setTiposJson(e.target.value)}
              rows={18}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              spellCheck={false}
            />
            <p className="text-xs text-slate-500">
              Próximo consecutivo de venta (solo lectura):{' '}
              <strong>{data.venta_siguiente_numero}</strong>
              {data.timezone ? (
                <>
                  {' '}
                  · Zona horaria: <strong>{data.timezone}</strong>
                </>
              ) : null}
            </p>
          </div>
        </SettingsPanel>
      )}

      {data && (
        <SettingsPanel
          kicker="Ventas"
          title="Numeración interna"
          description="Prefijo y ancho numérico para códigos de venta (no fiscal)."
        >
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <Input label="Prefijo" value={prefijo} onChange={(e) => setPrefijo(e.target.value)} />
            <Input
              type="number"
              label="Dígitos (padding)"
              value={String(padding)}
              min={1}
              max={12}
              onChange={(e) => setPadding(parseInt(e.target.value, 10) || 6)}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Ejemplo: prefijo <code className="rounded bg-slate-100 px-1">V-</code> y padding 6 →{' '}
            <code className="rounded bg-slate-100 px-1">V-000042</code>
          </p>
        </SettingsPanel>
      )}

      {data && (
        <div className="flex gap-2">
          <Button onClick={handleSave} loading={mutation.isPending}>
            Guardar cambios
          </Button>
        </div>
      )}
    </div>
  )
}
