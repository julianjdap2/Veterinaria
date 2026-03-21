import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ClienteSearchSelect } from '../clientes/components/ClienteSearchSelect'
import { useEspecies } from '../catalogo/hooks/useEspecies'
import { useRazas } from '../catalogo/hooks/useRazas'
import { createMascota } from './api'
import { mascotasKeys } from './hooks/useMascotas'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

export function MascotaCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [especieId, setEspecieId] = useState<string>('')
  const [razaId, setRazaId] = useState<string>('')
  const [sexo, setSexo] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [color, setColor] = useState('')
  const [peso, setPeso] = useState('')
  const [alergias, setAlergias] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: especies = [] } = useEspecies()
  const { data: razas = [] } = useRazas(especieId ? parseInt(especieId, 10) : null)

  const mutation = useMutation({
    mutationFn: createMascota,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mascotasKeys().list({ page: 1, page_size: 20 }) })
      toast.success('Mascota creada correctamente')
      navigate(`/mascotas/${data.id}`)
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al crear mascota.'
      setError(msg)
      toast.error(msg)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      toast.warning('El nombre es obligatorio.')
      return
    }
    const cId = clienteId
    if (cId == null || cId <= 0) {
      setError('Debes seleccionar un cliente.')
      toast.warning('Debes seleccionar un cliente.')
      return
    }
    mutation.mutate({
      nombre: nombre.trim(),
      cliente_id: cId,
      especie_id: especieId ? parseInt(especieId, 10) : undefined,
      raza_id: razaId ? parseInt(razaId, 10) : undefined,
      sexo: sexo || undefined,
      fecha_nacimiento: fechaNacimiento || undefined,
      color: color.trim() || undefined,
      peso: peso ? parseFloat(peso) : undefined,
      alergias: alergias.trim() || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nueva mascota</h1>
      <Card title="Datos de la mascota">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Nombre de la mascota"
              disabled={mutation.isPending}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Cliente <span className="text-red-500">*</span>
              </label>
              <ClienteSearchSelect
                value={clienteId}
                onChange={setClienteId}
                disabled={mutation.isPending}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Especie</label>
              <select
                value={especieId}
                onChange={(e) => {
                  setEspecieId(e.target.value)
                  setRazaId('')
                }}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Raza</label>
              <select
                value={razaId}
                onChange={(e) => setRazaId(e.target.value)}
                disabled={mutation.isPending || !especieId}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value="">—</option>
                {razas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre ?? `Raza ${r.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Sexo</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value="">—</option>
                <option value="M">Macho</option>
                <option value="H">Hembra</option>
              </select>
            </div>
            <Input
              type="date"
              label="Fecha de nacimiento"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Ej. Negro, blanco, marrón"
              disabled={mutation.isPending}
            />
            <Input
              type="number"
              step="0.1"
              min="0"
              label="Peso (kg)"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="Ej. 12.5"
              disabled={mutation.isPending}
            />
          </div>
          <Input
            label="Alergias"
            value={alergias}
            onChange={(e) => setAlergias(e.target.value)}
            placeholder="Alergias conocidas (opcional)"
            disabled={mutation.isPending}
          />
          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={mutation.isPending}>
              Crear mascota
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/mascotas')}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
