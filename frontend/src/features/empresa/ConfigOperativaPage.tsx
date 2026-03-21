import { useEffect, useState } from 'react'
import { useConfigOperativa, usePatchConfigOperativa } from './hooks/useConfigOperativa'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración operativa</h1>
      <p className="text-sm text-slate-600 max-w-3xl">
        Tipos de servicio para citas (motivo guardado = <code className="text-xs bg-slate-100 px-1 rounded">id</code>
        ), duración orientativa y permisos de urgente/recurrente. Numeración interna de ventas (no fiscal).
      </p>

      {isError && (
        <Alert variant="error">
          {error instanceof Error ? error.message : 'No se pudo cargar la configuración'}
        </Alert>
      )}

      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}

      {data && (
        <Card title="Tipos de servicio (JSON)">
          <div className="space-y-4 max-w-4xl">
            {parseError && (
              <Alert variant="error" onDismiss={() => setParseError(null)}>
                {parseError}
              </Alert>
            )}
            <textarea
              value={tiposJson}
              onChange={(e) => setTiposJson(e.target.value)}
              rows={18}
              className="w-full font-mono text-sm rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60"
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
        </Card>
      )}

      {data && (
        <Card title="Numeración de ventas">
          <div className="grid gap-4 max-w-xl sm:grid-cols-2">
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
            Ejemplo: prefijo <code>V-</code> y padding 6 → <code>V-000042</code>
          </p>
        </Card>
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
