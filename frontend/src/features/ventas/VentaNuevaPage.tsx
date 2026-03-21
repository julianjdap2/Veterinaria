import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useProductos } from '../productos/hooks/useProductos'
import { ClienteSearchSelect } from '../clientes/components/ClienteSearchSelect'
import { useCreateVenta } from './hooks/useVentas'
import { fetchConsultaById, fetchConsultasPorCliente, fetchFormula } from '../consultas/api'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import { PAGE_SIZE_SELECT } from '../../core/listDefaults'
import type { VentaItemCreate } from '../../api/types'
import type { FormulaItem } from '../../api/types'

type ChecklistRow = FormulaItem & {
  incluir: boolean
  cantidad: number
  stock_actual: number
}

export function VentaNuevaPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as {
    consultaId?: number
    clienteId?: number
    formulaItems?: { producto_id: number; cantidad: number; precio_unitario?: number }[]
  } | null
  const stateConsultaId = state?.consultaId
  const stateClienteId = state?.clienteId

  const [step, setStep] = useState<'cliente' | 'consulta' | 'checklist'>('cliente')
  const [clienteId, setClienteId] = useState<number | null>(stateClienteId ?? null)
  const [consultaId, setConsultaId] = useState<number | null>(stateConsultaId ?? null)
  const [checklist, setChecklist] = useState<ChecklistRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: consultasDelCliente = [] } = useQuery({
    queryKey: ['consultas', 'por-cliente', clienteId],
    queryFn: () => fetchConsultasPorCliente(clienteId!),
    enabled: step === 'consulta' && clienteId != null,
  })
  const { data: consulta } = useQuery({
    queryKey: ['consultas', 'detail', consultaId],
    queryFn: () => fetchConsultaById(consultaId!),
    enabled: consultaId != null,
  })
  const { data: formula = [] } = useQuery({
    queryKey: ['consultas', 'formula', consultaId],
    queryFn: () => fetchFormula(consultaId!),
    enabled: consultaId != null && (step === 'checklist' || !!stateConsultaId),
  })
  const { data: productosData } = useProductos(
    { page: 1, page_size: PAGE_SIZE_SELECT, incluir_inactivos: false },
    { enabled: formula.length > 0 }
  )
  const productos = productosData?.items ?? []
  const createMutation = useCreateVenta()

  const clienteIdFinal = consulta?.cliente_id ?? clienteId ?? stateClienteId ?? null

  // Si llegamos con consulta desde detalle, ir directo a checklist
  useEffect(() => {
    if (stateConsultaId && stateConsultaId > 0) {
      setConsultaId(stateConsultaId)
      setStep('checklist')
    }
  }, [stateConsultaId])

  // Armar checklist desde fórmula + stock cuando tenemos fórmula y productos
  useEffect(() => {
    if (formula.length === 0 || productos.length === 0) {
      if (formula.length > 0 && checklist.length === 0) setChecklist([])
      return
    }
    const stateItems = state?.formulaItems
    setChecklist(
      formula.map((f) => {
        const p = productos.find((x) => x.id === f.producto_id)
        const stock = p?.stock_actual ?? 0
        const stateItem = stateItems?.find((i) => i.producto_id === f.producto_id)
        const cant = stateItem?.cantidad ?? f.cantidad ?? 1
        return {
          ...f,
          incluir: stock >= (stateItem?.cantidad ?? cant),
          cantidad: cant,
          stock_actual: stock,
        }
      })
    )
  }, [formula, productos, state?.formulaItems?.length])

  function toggleIncluir(index: number) {
    setChecklist((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], incluir: !next[index].incluir }
      return next
    })
  }

  function updateCantidad(index: number, cantidad: number) {
    const n = Math.max(0, cantidad)
    setChecklist((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], cantidad: n }
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const toSend = checklist.filter((r) => r.incluir && r.cantidad > 0)
    if (toSend.length === 0) {
      setError('Marca al menos un artículo con cantidad para llevar.')
      toast.warning('Selecciona al menos un artículo.')
      return
    }
    const sinStock = toSend.filter((r) => r.stock_actual < r.cantidad)
    if (sinStock.length > 0) {
      setError(`Sin existencias suficientes: ${sinStock.map((r) => r.producto_nombre).join(', ')}`)
      toast.error('Ajusta cantidades o quita artículos sin stock.')
      return
    }
    const items: VentaItemCreate[] = toSend.map((r) => ({
      producto_id: r.producto_id,
      cantidad: r.cantidad,
      precio_unitario: r.precio != null ? Number(r.precio) : undefined,
    }))
    createMutation.mutate(
      {
        cliente_id: clienteIdFinal ?? null,
        consulta_id: consultaId ?? null,
        items,
      },
      {
        onSuccess: () => {
          toast.success('Venta registrada')
          navigate(consultaId ? `/consultas/${consultaId}` : '/ventas')
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Error al registrar venta.')
          toast.error('Error al registrar venta')
        },
      }
    )
  }

  const total = checklist
    .filter((r) => r.incluir && r.cantidad > 0)
    .reduce((sum, r) => sum + (r.precio != null ? Number(r.precio) : 0) * r.cantidad, 0)
  const haySinExistencias = checklist.some((r) => r.incluir && r.stock_actual < r.cantidad)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {consultaId ? 'Registrar venta desde fórmula' : 'Nueva venta'}
        </h1>
        {consultaId && (
          <Link to={`/consultas/${consultaId}`} className="text-sm text-primary-600 hover:underline">
            ← Volver a consulta
          </Link>
        )}
        {!consultaId && step !== 'cliente' && (
          <button
            type="button"
            onClick={() => {
              if (step === 'checklist') setStep('consulta')
              else setStep('cliente')
            }}
            className="text-sm text-primary-600 hover:underline"
          >
            ← Atrás
          </button>
        )}
      </div>

      {!stateConsultaId && step === 'cliente' && (
        <Card title="1. Seleccionar propietario (cliente)">
          <p className="text-sm text-slate-600 mb-3">
            Elige el cliente al que se le registrará la venta. Luego podrás elegir la consulta y la fórmula.
          </p>
          <ClienteSearchSelect
            value={clienteId}
            onChange={(id) => {
              setClienteId(id)
              setConsultaId(null)
            }}
          />
          <div className="mt-4">
            <Button
              onClick={() => clienteId != null && setStep('consulta')}
              disabled={!clienteId}
            >
              Siguiente: elegir consulta
            </Button>
          </div>
        </Card>
      )}

      {!stateConsultaId && step === 'consulta' && (
        <Card title="2. Seleccionar consulta">
          <p className="text-sm text-slate-600 mb-3">
            Elige la consulta cuya fórmula se usará para la venta (medicamentos prescritos).
          </p>
          {consultasDelCliente.length === 0 ? (
            <p className="text-sm text-amber-700">
              No hay consultas para este cliente. El veterinario debe haber generado una consulta con fórmula.
            </p>
          ) : (
            <ul className="space-y-2">
              {consultasDelCliente.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setConsultaId(c.id)
                      setStep('checklist')
                    }}
                    className="w-full text-left rounded-xl border border-slate-200 px-4 py-3 hover:bg-primary-50 hover:border-primary-200 transition-colors"
                  >
                    <span className="font-medium">Consulta #{c.id}</span>
                    <span className="text-slate-500 ml-2">– Mascota: {c.mascota_nombre}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Button variant="secondary" onClick={() => setStep('cliente')}>
              Atrás
            </Button>
          </div>
        </Card>
      )}

      {step === 'checklist' && consultaId != null && (
        <Card title={stateConsultaId ? 'Artículos de la fórmula' : '3. Revisar artículos a llevar'}>
          {consulta && (
            <p className="text-sm text-slate-600 mb-4">
              Propietario: cliente asociado a la mascota de esta consulta. Marca los artículos que llevará y ajusta cantidades. Si no hay stock, se muestra «Sin existencias».
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error" onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}

            {checklist.length === 0 && formula.length === 0 && (
              <p className="text-slate-500">Esta consulta no tiene fórmula. Añade medicamentos en la consulta primero.</p>
            )}
            {checklist.length === 0 && formula.length > 0 && (
              <p className="text-slate-500">Cargando productos y stock...</p>
            )}

            {checklist.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="pb-2 pr-4 w-10">Llevar</th>
                      <th className="pb-2 pr-4">Medicamento</th>
                      <th className="pb-2 pr-4">Presentación</th>
                      <th className="pb-2 pr-4 w-24">Precio</th>
                      <th className="pb-2 pr-4 w-24">Cantidad</th>
                      <th className="pb-2 pr-4 w-28">Stock</th>
                      <th className="pb-2 pr-4">Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklist.map((r, idx) => {
                      const sinStock = r.stock_actual < r.cantidad
                      return (
                        <tr
                          key={r.id}
                          className={`border-b border-slate-100 ${sinStock && r.incluir ? 'bg-red-50' : ''}`}
                        >
                          <td className="py-2 pr-4">
                            <input
                              type="checkbox"
                              checked={r.incluir}
                              onChange={() => toggleIncluir(idx)}
                              disabled={r.stock_actual === 0}
                              className="rounded border-slate-300"
                            />
                          </td>
                          <td className="py-2 pr-4 font-medium">{r.producto_nombre ?? '—'}</td>
                          <td className="py-2 pr-4">{r.presentacion ?? '—'}</td>
                          <td className="py-2 pr-4">
                            {r.precio != null ? Number(r.precio).toFixed(2) : '—'}
                          </td>
                          <td className="py-2 pr-4">
                            <input
                              type="number"
                              min="0"
                              value={r.cantidad}
                              onChange={(e) => updateCantidad(idx, parseInt(e.target.value, 10) || 0)}
                              className="w-20 rounded border border-slate-300 px-2 py-1.5"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            {r.stock_actual === 0 ? (
                              <span className="font-medium text-red-600">Sin existencias</span>
                            ) : r.stock_actual < r.cantidad && r.incluir ? (
                              <span className="text-amber-700">
                                Sin existencias ({r.stock_actual} en stock)
                              </span>
                            ) : (
                              <span className="text-slate-600">{r.stock_actual}</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 max-w-[180px] truncate" title={r.observacion ?? ''}>
                            {r.observacion ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {checklist.filter((r) => r.incluir && r.cantidad > 0).length > 0 && (
              <p className="text-right font-medium">
                Total: <span className="text-lg">{total.toFixed(2)}</span>
              </p>
            )}

            {checklist.length > 0 && (
              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  disabled={
                    checklist.filter((r) => r.incluir && r.cantidad > 0).length === 0 || haySinExistencias
                  }
                >
                  Registrar venta
                </Button>
                <Link to={consultaId ? `/consultas/${consultaId}` : '/ventas'}>
                  <Button type="button" variant="secondary" disabled={createMutation.isPending}>
                    Cancelar
                  </Button>
                </Link>
              </div>
            )}
          </form>
        </Card>
      )}
    </div>
  )
}
