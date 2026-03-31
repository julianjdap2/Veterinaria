import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEspecies } from '../../catalogo/hooks/useEspecies'
import { useRazas } from '../../catalogo/hooks/useRazas'
import { updateMascota } from '../api'
import type { Mascota } from '../../../api/types'
import type { MascotaExtrasFlags } from '../mascotaExtrasStorage'
import { mergeMascotaExtras } from '../mascotaExtrasStorage'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { Alert } from '../../../shared/ui/Alert'
import { toast } from '../../../core/toast-store'
import { ApiError } from '../../../api/errors'

type Props = {
  open: boolean
  onClose: () => void
  mascotaId: number
  mascota: Mascota
  flags: MascotaExtrasFlags
  onFlagsChange: (f: MascotaExtrasFlags) => void
}

export function EditarMascotaBasicaModal({ open, onClose, mascotaId, mascota, flags, onFlagsChange }: Props) {
  const queryClient = useQueryClient()
  const { data: especies = [] } = useEspecies()
  const [nombre, setNombre] = useState('')
  const [especieId, setEspecieId] = useState('')
  const [razaId, setRazaId] = useState('')
  const [sexo, setSexo] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [color, setColor] = useState('')
  const [peso, setPeso] = useState('')
  const [alergias, setAlergias] = useState('')
  const [animalServicio, setAnimalServicio] = useState(false)
  const [apoyoEmocional, setApoyoEmocional] = useState(false)
  const [fallecido, setFallecido] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: razas = [] } = useRazas(especieId ? parseInt(especieId, 10) : null)

  useEffect(() => {
    if (!open) return
    setNombre(mascota.nombre ?? '')
    setEspecieId(mascota.especie_id != null ? String(mascota.especie_id) : '')
    setRazaId(mascota.raza_id != null ? String(mascota.raza_id) : '')
    setSexo(mascota.sexo ?? '')
    setFechaNacimiento(mascota.fecha_nacimiento ? mascota.fecha_nacimiento.slice(0, 10) : '')
    setColor(mascota.color ?? '')
    setPeso(mascota.peso != null ? String(mascota.peso) : '')
    setAlergias(mascota.alergias ?? '')
    setAnimalServicio(!!flags.animalServicio)
    setApoyoEmocional(!!flags.apoyoEmocional)
    setFallecido(!!flags.fallecido)
    setError(null)
  }, [open, mascota, flags])

  const mutation = useMutation({
    mutationFn: () =>
      updateMascota(mascotaId, {
        nombre: nombre.trim(),
        especie_id: especieId ? parseInt(especieId, 10) : null,
        raza_id: razaId ? parseInt(razaId, 10) : null,
        sexo: sexo || undefined,
        fecha_nacimiento: fechaNacimiento || undefined,
        color: color.trim() || undefined,
        peso: peso ? parseFloat(peso) : undefined,
        alergias: alergias.trim() || undefined,
      }),
    onSuccess: () => {
      mergeMascotaExtras(mascotaId, {
        flags: {
          animalServicio,
          apoyoEmocional,
          fallecido,
        },
      })
      onFlagsChange({
        animalServicio,
        apoyoEmocional,
        fallecido,
      })
      queryClient.invalidateQueries({ queryKey: ['mascotas', mascotaId] })
      toast.success('Mascota actualizada')
      onClose()
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo guardar.'
      setError(msg)
      toast.error(msg)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar mascota" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Código / chip (notas)</label>
              <input
                disabled
                placeholder="Identificador único (opcional) — próximamente en API"
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Especie</label>
                <select
                  value={especieId}
                  onChange={(e) => {
                    setEspecieId(e.target.value)
                    setRazaId('')
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {especies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Raza</label>
                <select
                  value={razaId}
                  onChange={(e) => setRazaId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {razas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Género</label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  <option value="M">Macho</option>
                  <option value="H">Hembra</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Color</label>
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Peso (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Alergias</label>
              <textarea
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input type="checkbox" checked={animalServicio} onChange={(e) => setAnimalServicio(e.target.checked)} />
              Animal de servicio
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input type="checkbox" checked={apoyoEmocional} onChange={(e) => setApoyoEmocional(e.target.checked)} />
              Animal de apoyo emocional
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/50 p-2 text-sm text-red-900">
              <input type="checkbox" checked={fallecido} onChange={(e) => setFallecido(e.target.checked)} />
              Fallecido
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
