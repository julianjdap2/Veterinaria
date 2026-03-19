import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useClientes } from '../clientes/hooks/useClientes'
import { useMascotas } from '../mascotas/hooks/useMascotas'
import { useVeterinarios } from '../usuarios/hooks/useUsuarios'
import { useMotivosConsulta } from '../catalogo/hooks/useMotivosConsulta'
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue'
import { createCita } from './api'
import { citasKeys } from './hooks/useCitasAgenda'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'

const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH_LENGTH = 2

/** Si el texto son solo dígitos, buscar por documento; si no, por nombre. */
function clientSearchFilters(term: string) {
  if (term.length < MIN_SEARCH_LENGTH) return {}
  const onlyDigits = /^\d+$/.test(term)
  return onlyDigits
    ? { page: 1, page_size: 15, documento: term }
    : { page: 1, page_size: 15, nombre: term }
}

export function CitaCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [clienteSearch, setClienteSearch] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<{ id: number; nombre: string } | null>(null)
  const [showClientResults, setShowClientResults] = useState(false)
  const [mascotaId, setMascotaId] = useState('')
  const [fecha, setFecha] = useState('')
  const [motivoPredefinido, setMotivoPredefinido] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [veterinarioId, setVeterinarioId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const clientSearchRef = useRef<HTMLDivElement>(null)

  const user = useAuthStore((s) => s.user)
  const puedeAsignarVet = user?.rolId === ROLES.ADMIN || user?.rolId === ROLES.RECEPCION
  const { data: veterinarios = [] } = useVeterinarios({ enabled: puedeAsignarVet })
  const { data: motivosList = [] } = useMotivosConsulta()

  const debouncedSearch = useDebouncedValue(clienteSearch.trim(), SEARCH_DEBOUNCE_MS)
  const clientFilters = clientSearchFilters(debouncedSearch)
  const hasSearchTerm = debouncedSearch.length >= MIN_SEARCH_LENGTH
  const { data: clientesData, isLoading: searchingClientes } = useClientes(clientFilters, {
    enabled: hasSearchTerm,
  })
  const { data: mascotasData } = useMascotas(
    {
      page: 1,
      page_size: 50,
      cliente_id: selectedCliente?.id,
      incluir_inactivos: false,
    },
    { enabled: !!selectedCliente }
  )

  const clientes = clientesData?.items ?? []
  const mascotas = mascotasData?.items ?? []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const mutation = useMutation({
    mutationFn: createCita,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: citasKeys().agenda({ page: 1, page_size: 20 }) })
      toast.success('Cita creada correctamente')
      navigate(`/citas/${data.id}`)
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al crear cita.'
      setError(msg)
      toast.error(msg)
    },
  })

  function handleSelectCliente(id: number, nombre: string) {
    setSelectedCliente({ id, nombre })
    setClienteSearch('')
    setShowClientResults(false)
    setMascotaId('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const mId = parseInt(mascotaId, 10)
    if (!mascotaId || Number.isNaN(mId)) {
      setError('Selecciona una mascota.')
      toast.warning('Selecciona una mascota.')
      return
    }
    const motivoFinal =
      motivoPredefinido === 'otro' ? motivoOtro.trim() : (motivoPredefinido || undefined)
    mutation.mutate({
      mascota_id: mId,
      fecha: fecha ? `${fecha}:00` : undefined,
      motivo: motivoFinal,
      // El estado inicial SIEMPRE es 'pendiente' (controlado por backend/state machine).
      estado: 'pendiente',
      veterinario_id: veterinarioId ? parseInt(veterinarioId, 10) : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nueva cita</h1>
      <Card title="Datos de la cita">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Paso 1: Cliente */}
          <div ref={clientSearchRef}>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cliente <span className="text-red-500">*</span>
            </label>
            {selectedCliente ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <span className="font-medium text-slate-900">{selectedCliente.nombre}</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm text-primary-600"
                  onClick={() => {
                    setSelectedCliente(null)
                    setMascotaId('')
                  }}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <>
                <Input
                  type="text"
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value)
                    setShowClientResults(true)
                  }}
                  onFocus={() => debouncedSearch.length >= MIN_SEARCH_LENGTH && setShowClientResults(true)}
                  placeholder="Buscar por nombre o documento (mín. 2 caracteres)"
                  disabled={mutation.isPending}
                  autoComplete="off"
                />
                {showClientResults && hasSearchTerm && (
                  <div className="relative z-10 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-card-hover">
                    {searchingClientes && (
                      <p className="px-3.5 py-2 text-sm text-slate-500">Buscando...</p>
                    )}
                    {!searchingClientes && clientes.length === 0 && (
                      <p className="px-3.5 py-2 text-sm text-slate-500">
                        No se encontraron clientes. Prueba con otro nombre.
                      </p>
                    )}
                    {!searchingClientes &&
                      clientes.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="block w-full px-3.5 py-2 text-left text-sm text-slate-900 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none rounded-lg"
                          onClick={() => handleSelectCliente(c.id, c.nombre)}
                        >
                          {c.nombre}
                          {c.documento ? (
                            <span className="ml-2 text-slate-500">({c.documento})</span>
                          ) : null}
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Paso 2: Mascota (solo si hay cliente) */}
          {selectedCliente && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mascota <span className="text-red-500">*</span>
              </label>
              {mascotas.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Este cliente no tiene mascotas registradas.{' '}
                  <Link
                    to="/mascotas/nuevo"
                    className="font-medium text-primary-600 hover:underline"
                  >
                    Registrar mascota
                  </Link>
                </p>
              ) : (
                <select
                  value={mascotaId}
                  onChange={(e) => setMascotaId(e.target.value)}
                  required
                  disabled={mutation.isPending}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
                >
                  <option value="">Seleccionar mascota</option>
                  {mascotas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {puedeAsignarVet && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Asignar veterinario</label>
              <select
                value={veterinarioId}
                onChange={(e) => setVeterinarioId(e.target.value)}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value="">Sin asignar</option>
                {veterinarios.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="datetime-local"
              label="Fecha y hora"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Motivo</label>
            <select
              value={motivoPredefinido}
              onChange={(e) => setMotivoPredefinido(e.target.value)}
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
            >
              <option value="">Seleccionar motivo</option>
              {motivosList.map((m) => (
                <option key={m.id} value={m.nombre}>
                  {m.nombre}
                </option>
              ))}
              <option value="otro">Otro (especificar)</option>
            </select>
            {motivoPredefinido === 'otro' && (
              <Input
                className="mt-2"
                value={motivoOtro}
                onChange={(e) => setMotivoOtro(e.target.value)}
                placeholder="Indique el motivo..."
                maxLength={200}
                disabled={mutation.isPending}
              />
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!selectedCliente || mascotas.length === 0}
            >
              Crear cita
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/citas')}
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
