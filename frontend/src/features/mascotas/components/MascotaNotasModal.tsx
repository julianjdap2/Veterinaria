import { useEffect, useState } from 'react'
import { mergeMascotaExtras } from '../mascotaExtrasStorage'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { toast } from '../../../core/toast-store'

type Props = {
  open: boolean
  onClose: () => void
  mascotaId: number
  mascotaNombre: string
  initial: string
  onSaved: (texto: string) => void
}

export function MascotaNotasModal({ open, onClose, mascotaId, mascotaNombre, initial, onSaved }: Props) {
  const [texto, setTexto] = useState(initial)

  useEffect(() => {
    if (!open) return
    setTexto(initial)
  }, [open, initial])

  function save() {
    mergeMascotaExtras(mascotaId, { notasImportantes: texto })
    onSaved(texto)
    toast.success('Notas guardadas en este navegador')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Notas importantes — ${mascotaNombre}`} size="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Visible solo en este equipo hasta sincronizar con API.</p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={10}
          placeholder="Notas clínicas o administrativas relevantes…"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />
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
