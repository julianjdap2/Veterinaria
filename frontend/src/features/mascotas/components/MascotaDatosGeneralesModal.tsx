import { useEffect, useState } from 'react'
import { mergeMascotaExtras, type MascotaDatosGenerales } from '../mascotaExtrasStorage'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { toast } from '../../../core/toast-store'

type Props = {
  open: boolean
  onClose: () => void
  mascotaId: number
  mascotaNombre: string
  initial: MascotaDatosGenerales
  onSaved: (d: MascotaDatosGenerales) => void
}

export function MascotaDatosGeneralesModal({ open, onClose, mascotaId, mascotaNombre, initial, onSaved }: Props) {
  const [d, setD] = useState<MascotaDatosGenerales>(initial)

  useEffect(() => {
    if (!open) return
    setD(initial)
  }, [open, initial])

  function save() {
    mergeMascotaExtras(mascotaId, { datosGenerales: d })
    onSaved(d)
    toast.success('Datos generales guardados en este navegador')
    onClose()
  }

  const set =
    (k: keyof MascotaDatosGenerales) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setD((prev) => ({ ...prev, [k]: e.target.value }))
    }

  return (
    <Modal open={open} onClose={onClose} title={`Registro de datos generales — ${mascotaNombre}`} size="2xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Estos campos se guardan localmente en su navegador hasta que exista persistencia en servidor.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Alimento</label>
            <input value={d.alimento ?? ''} onChange={set('alimento')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad de alimento</label>
            <input
              value={d.cantidadAlimento ?? ''}
              onChange={set('cantidadAlimento')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Und. alimento</label>
            <select
              value={d.undAlimento ?? ''}
              onChange={set('undAlimento')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="g">Gramos</option>
              <option value="kg">Kilogramos</option>
              <option value="latas">Latas</option>
              <option value="porciones">Porciones</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Frecuencia de alimento</label>
            <input
              value={d.frecuenciaAlimento ?? ''}
              onChange={set('frecuenciaAlimento')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Vivienda</label>
            <input value={d.vivienda ?? ''} onChange={set('vivienda')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Frecuencia baño</label>
            <input
              value={d.frecuenciaBano ?? ''}
              onChange={set('frecuenciaBano')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Productos de baño</label>
            <input
              value={d.productosBano ?? ''}
              onChange={set('productosBano')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Otras mascotas</label>
            <input
              value={d.otrasMascotas ?? ''}
              onChange={set('otrasMascotas')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Último calor</label>
            <input
              type="date"
              value={d.ultimoCalor ?? ''}
              onChange={set('ultimoCalor')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" onClick={save}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
