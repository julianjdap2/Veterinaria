import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ApiError } from '../../api/errors'
import type { ClienteIdentidadBusqueda } from '../../api/types'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { useEspecies } from '../catalogo/hooks/useEspecies'
import { useAllRazas } from '../catalogo/hooks/useRazas'
import { PlanSaludMascotaBanner } from '../planes-salud/components/PlanSaludMascotaBanner'
import { fetchMascotas } from '../mascotas/api'
import { fetchClienteById, fetchClienteIdentidad, vincularParcial, vincularPresencial } from './api'
import { PawPrint, Search, UserRound } from 'lucide-react'
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '../../shared/ui/Table'

const MARKETING = ['Google / buscador', 'Redes sociales', 'Referido', 'Fachada / pasé por la zona', 'Otro']

type ModalKind = 'none' | 'elegir' | 'presencial' | 'parcial'

function chipVinculo(estado: ClienteIdentidadBusqueda['estado_vinculo']) {
  if (estado === 'completo')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Vinculado
      </span>
    )
  if (estado === 'parcial')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-violet-200/80">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        Parcial
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Sin vínculo
    </span>
  )
}

export function ConsultorioPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawClienteId = searchParams.get('cliente_id')
  const fichaClienteId = (() => {
    if (!rawClienteId) return null
    const n = parseInt(rawClienteId, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  })()

  const { data: clienteFicha, isLoading: loadingFichaCliente, isError: errFichaCliente } = useQuery({
    queryKey: ['clientes', fichaClienteId],
    queryFn: () => fetchClienteById(fichaClienteId!),
    enabled: fichaClienteId != null,
  })

  const { data: mascotasFichaData, isLoading: loadingFichaMascotas } = useQuery({
    queryKey: ['mascotas', 'consultorio-ficha', fichaClienteId],
    queryFn: () =>
      fetchMascotas({
        cliente_id: fichaClienteId!,
        page: 1,
        page_size: 100,
        incluir_inactivos: true,
      }),
    enabled: fichaClienteId != null,
  })
  const mascotasFicha = mascotasFichaData?.items ?? []

  const { data: especies = [] } = useEspecies()
  const { data: razas = [] } = useAllRazas()
  const especiesMap = new Map(especies.map((s) => [s.id, s.nombre]))
  const razasMap = new Map(razas.map((r) => [r.id, r.nombre ?? `Raza ${r.id}`]))

  function cerrarFicha() {
    navigate('/consultorio', { replace: true })
  }

  const [docInput, setDocInput] = useState('')
  const [mascotaInput, setMascotaInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<ClienteIdentidadBusqueda | null>(null)

  const [modal, setModal] = useState<ModalKind>('none')
  const [docForm, setDocForm] = useState('')
  const [telForm, setTelForm] = useState('')
  const [consent, setConsent] = useState(false)
  const [marketing, setMarketing] = useState('')
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(120)

  const buscar = useCallback(async () => {
    setErr(null)
    setData(null)
    const d = docInput.trim()
    if (d.length < 4) {
      setErr('Escriba al menos 4 caracteres del documento.')
      return
    }
    setLoading(true)
    try {
      const r = await fetchClienteIdentidad(d)
      setData(r)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No se pudo buscar.')
    } finally {
      setLoading(false)
    }
  }, [docInput])

  useEffect(() => {
    if (modal !== 'presencial' && modal !== 'parcial') return
    setSecondsLeft(120)
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [modal])

  useEffect(() => {
    if (modal === 'presencial' || modal === 'parcial') {
      setDocForm(docInput.trim())
      setTelForm('')
      setConsent(false)
      setMarketing('')
      setSubmitErr(null)
    }
  }, [modal, docInput])

  useEffect(() => {
    if (clienteFicha?.documento) setDocInput(clienteFicha.documento)
  }, [clienteFicha?.documento])

  function openVincular() {
    setModal('elegir')
  }

  async function onPresencial() {
    if (!data?.cliente_id) return
    setSubmitting(true)
    setSubmitErr(null)
    try {
      await vincularPresencial({
        cliente_id: data.cliente_id,
        documento: docForm.trim(),
        telefono: telForm.trim(),
        confirmo_consentimiento: consent,
        marketing_canal: marketing || null,
      })
      setModal('none')
      await buscar()
    } catch (e) {
      setSubmitErr(e instanceof ApiError ? e.message : 'No se pudo completar.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onParcial() {
    if (!data?.cliente_id) return
    setSubmitting(true)
    setSubmitErr(null)
    try {
      await vincularParcial({
        cliente_id: data.cliente_id,
        documento: docForm.trim(),
        marketing_canal: marketing || null,
      })
      setModal('none')
      await buscar()
    } catch (e) {
      setSubmitErr(e instanceof ApiError ? e.message : 'No se pudo completar.')
    } finally {
      setSubmitting(false)
    }
  }

  const modalOpen = modal !== 'none'
  const bloqueadoTiempo = (modal === 'presencial' || modal === 'parcial') && secondsLeft === 0

  return (
    <div className="w-full space-y-6 pb-10">
      <PageHeader
        breadcrumbs={[{ label: 'Inicio', to: '/dashboard' }, { label: 'Consultorio' }]}
        title="Consultorio"
        subtitle={
          fichaClienteId && clienteFicha
            ? `Ficha: ${clienteFicha.documento ?? '—'} — ${clienteFicha.nombre}. También puede buscar por documento o gestionar vínculos.`
            : 'Identidad única del propietario: busque por documento, detecte registros existentes y gestione el vínculo con su clínica sin duplicar historiales.'
        }
        actions={
          <Link to="/clientes/nuevo">
            <Button variant="secondary" className="rounded-xl">
              + Registrar propietario
            </Button>
          </Link>
        }
      />

      {fichaClienteId != null && (
        <>
          {loadingFichaCliente && <p className="text-sm text-slate-500">Cargando ficha del propietario…</p>}
          {errFichaCliente && (
            <Card className="border-red-200 bg-red-50/60 p-4 shadow-sm">
              <p className="text-sm font-medium text-red-900">
                No se pudo cargar este propietario. Compruebe el identificador o sus permisos (acceso a datos de
                tutores).
              </p>
              <Button type="button" variant="secondary" className="mt-3 rounded-xl" onClick={cerrarFicha}>
                Volver al consultorio
              </Button>
            </Card>
          )}
          {clienteFicha && !errFichaCliente && (
            <>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5 shadow-card ring-1 ring-slate-100">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
                    <UserRound className="h-4 w-4 text-primary-600" />
                    Propietario
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" className="rounded-lg text-xs" onClick={cerrarFicha}>
                      Otra búsqueda
                    </Button>
                    <Link to={`/clientes/${clienteFicha.id}/editar`}>
                      <Button variant="secondary" className="rounded-lg text-xs">
                        Editar
                      </Button>
                    </Link>
                    <Link to={`/clientes/${clienteFicha.id}`}>
                      <Button variant="ghost" className="rounded-lg text-xs">
                        Ficha administrativa
                      </Button>
                    </Link>
                  </div>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{clienteFicha.nombre}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Identificación</dt>
                    <dd className="mt-0.5 text-slate-800">{clienteFicha.documento ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Teléfonos</dt>
                    <dd className="mt-0.5 text-slate-800">{clienteFicha.telefono ?? '—'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Dirección</dt>
                    <dd className="mt-0.5 text-slate-800">{clienteFicha.direccion ?? '—'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Correo</dt>
                    <dd className="mt-0.5 text-slate-800">{clienteFicha.email ?? '—'}</dd>
                  </div>
                </dl>
                {!clienteFicha.activo ? (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
                    Este propietario está marcado como inactivo.
                  </p>
                ) : null}
              </Card>

              <Card className="p-5 shadow-card ring-1 ring-slate-100">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
                    <PawPrint className="h-4 w-4 text-primary-600" />
                    Mascotas
                  </h2>
                  <Link to={`/mascotas/nuevo?cliente_id=${clienteFicha.id}`}>
                    <Button className="rounded-lg text-xs">+ Registrar mascota</Button>
                  </Link>
                </div>
                {loadingFichaMascotas ? (
                  <p className="text-sm text-slate-500">Cargando mascotas…</p>
                ) : mascotasFicha.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay mascotas registradas para este propietario.</p>
                ) : (
                  <div className="rounded-xl border border-emerald-100/50 bg-white ring-1 ring-emerald-50/30">
                    <Table plain className="min-w-full text-left text-sm">
                      <TableHead>
                        <TableRow header>
                          <TableTh className="!py-2 !pl-3 !pr-3">Acciones</TableTh>
                          <TableTh className="!py-2 !pl-3 !pr-3">Nombre</TableTh>
                          <TableTh className="!py-2 !pl-3 !pr-3">Especie</TableTh>
                          <TableTh className="!py-2 !pl-3 !pr-3">Raza</TableTh>
                          <TableTh className="!py-2 !pl-3 !pr-3">Género</TableTh>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {mascotasFicha.map((m) => (
                          <TableRow key={m.id}>
                            <TableTd className="!py-2 !pl-3 !pr-3">
                              <Link
                                to={`/mascotas/${m.id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700"
                              >
                                Historia clínica
                              </Link>
                            </TableTd>
                            <TableTd className="!py-2 !pl-3 !pr-3 font-medium text-slate-900">{m.nombre}</TableTd>
                            <TableTd className="!py-2 !pl-3 !pr-3 text-slate-600">
                              {m.especie_id != null ? (especiesMap.get(m.especie_id) ?? `#${m.especie_id}`) : '—'}
                            </TableTd>
                            <TableTd className="!py-2 !pl-3 !pr-3 text-slate-600">
                              {m.raza_id != null ? (razasMap.get(m.raza_id) ?? `#${m.raza_id}`) : '—'}
                            </TableTd>
                            <TableTd className="!py-2 !pl-3 !pr-3 text-slate-600">{m.sexo ?? '—'}</TableTd>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </div>
            {!loadingFichaMascotas && mascotasFicha.length > 0 ? (
              <div className="space-y-3">
                {mascotasFicha.map((m) => (
                  <PlanSaludMascotaBanner
                    key={m.id}
                    mascotaId={m.id}
                    mascotaNombre={m.nombre}
                    etiquetaMascota={mascotasFicha.length > 1}
                  />
                ))}
              </div>
            ) : null}
            </>
          )}
        </>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-slate-200/80 bg-gradient-to-br from-white via-slate-50/50 to-primary-50/40 p-5 shadow-card ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="consultorio-doc" className="mb-1 block text-sm font-medium text-slate-700">
              Documento del propietario
            </label>
            <input
              id="consultorio-doc"
              value={docInput}
              onChange={(e) => setDocInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void buscar()}
              placeholder="Cédula, pasaporte o documento equivalente"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={() => {
                setDocInput('')
                setData(null)
                setErr(null)
              }}
            >
              Limpiar
            </Button>
            <Button type="button" className="rounded-xl px-5" disabled={loading} onClick={() => void buscar()}>
              <span className="inline-flex items-center gap-1.5">
                <Search className="h-4 w-4" />
                {loading ? 'Buscando…' : 'Buscar'}
              </span>
            </Button>
          </div>
        </div>
        {err && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {err}
          </p>
        )}
      </Card>
      </motion.div>

      {data && !data.encontrado && (
        <Card className="border-dashed border-slate-200 bg-slate-50/50 p-8 text-center shadow-none">
          <p className="text-sm text-slate-600">No hay propietario registrado con ese documento.</p>
          <p className="mt-2 text-sm text-slate-500">
            Puede darlo de alta en{' '}
            <Link to="/clientes/nuevo" className="font-medium text-primary-600 hover:underline">
              Nuevo cliente
            </Link>
            .
          </p>
        </Card>
      )}

      {data?.encontrado && data.cliente_id != null && (
        <Card className="overflow-hidden p-0 shadow-sm ring-1 ring-slate-100">
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Propietario</label>
              <input
                value={docInput}
                onChange={(e) => setDocInput(e.target.value)}
                placeholder="Buscar por identificación, teléfono o nombre"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Mascota</label>
              <input
                value={mascotaInput}
                onChange={(e) => setMascotaInput(e.target.value)}
                placeholder="Buscar por nombre o identificador de mascota"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              />
            </div>
          </div>
          <div className="overflow-x-auto rounded-b-xl">
            <Table plain className="min-w-full text-left text-sm">
              <TableHead>
                <TableRow header>
                  <TableTh className="!px-4 !py-3">Nombre</TableTh>
                  <TableTh className="!px-4 !py-3">Documento</TableTh>
                  <TableTh className="!px-4 !py-3">Contacto</TableTh>
                  <TableTh className="!px-4 !py-3">Mascotas</TableTh>
                  <TableTh className="!px-4 !py-3">Vínculo</TableTh>
                  <TableTh className="!px-4 !py-3 text-right">Acciones</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableTd className="!px-4 !py-3 font-medium text-slate-900">{data.nombre ?? '—'}</TableTd>
                  <TableTd className="!px-4 !py-3 font-mono text-slate-700">{data.documento ?? '—'}</TableTd>
                  <TableTd className="!px-4 !py-3 text-slate-600">
                    <div>{data.telefono ?? '—'}</div>
                    <div className="text-xs text-slate-500">{data.email ?? ''}</div>
                  </TableTd>
                  <TableTd className="!px-4 !py-3">
                    {data.mascotas.filter((m) => {
                      const q = mascotaInput.trim().toLowerCase()
                      if (!q) return true
                      return `${m.nombre} ${m.id}`.toLowerCase().includes(q)
                    }).length === 0 ? (
                      <p className="text-sm text-slate-500">
                        {data.estado_vinculo === 'ninguno'
                          ? 'Sin listado de mascotas hasta vincular al propietario con esta clínica.'
                          : '—'}
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {data.mascotas
                          .filter((m) => {
                            const q = mascotaInput.trim().toLowerCase()
                            if (!q) return true
                            return `${m.nombre} ${m.id}`.toLowerCase().includes(q)
                          })
                          .map((m) => (
                          <li key={m.id} className="flex items-center gap-2 text-slate-700">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-primary-700">
                              {m.nombre.slice(0, 1).toUpperCase()}
                            </span>
                            <span>
                              {m.nombre}
                              {m.sexo ? (
                                <span className="ml-1 text-xs text-slate-500">({m.sexo})</span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableTd>
                  <TableTd className="!px-4 !py-3">{chipVinculo(data.estado_vinculo)}</TableTd>
                  <TableTd className="!px-4 !py-3 text-right">
                    {data.estado_vinculo === 'completo' ? (
                      <Link
                        to={`/consultorio?cliente_id=${data.cliente_id}`}
                        className="inline-flex rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700"
                      >
                        Abrir ficha
                      </Link>
                    ) : data.puede_vincular ? (
                      <button
                        type="button"
                        onClick={openVincular}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600"
                      >
                        <span aria-hidden>⎘</span>
                        Vincular
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableTd>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl ring-1 ring-primary-900/5 transition-transform duration-200">
            {modal === 'elegir' && (
              <>
                <h2 className="text-lg font-semibold text-slate-900">Vincular con esta clínica</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Elija cómo acreditar el vínculo. El acceso completo requiere comprobar datos con el propietario
                  presente; el acceso parcial permite operar mientras se solicita consentimiento ampliado (correo de
                  confirmación en una próxima versión).
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setModal('presencial')}
                    className="rounded-2xl border-2 border-primary-500/30 bg-gradient-to-br from-primary-50 to-white p-4 text-left shadow-sm transition hover:border-primary-500 hover:shadow-md"
                  >
                    <span className="text-sm font-semibold text-primary-900">Verificación en sala</span>
                    <p className="mt-1 text-xs text-slate-600">Documento y teléfono coinciden con el registro.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal('parcial')}
                    className="rounded-2xl border-2 border-violet-300/40 bg-gradient-to-br from-violet-50 to-white p-4 text-left shadow-sm transition hover:border-violet-400 hover:shadow-md"
                  >
                    <span className="text-sm font-semibold text-violet-900">Vínculo provisional</span>
                    <p className="mt-1 text-xs text-slate-600">
                      Solo documento; historial de otras clínicas restringido. Se envía un correo al propietario para
                      autorizar acceso completo con un clic.
                    </p>
                  </button>
                </div>
                <Button type="button" variant="secondary" className="mt-6 w-full rounded-xl" onClick={() => setModal('none')}>
                  Cancelar
                </Button>
              </>
            )}

            {(modal === 'presencial' || modal === 'parcial') && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {modal === 'presencial' ? 'Verificación en sala' : 'Vínculo provisional'}
                  </h2>
                  <button
                    type="button"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => setModal('none')}
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <div
                  className={`mt-4 rounded-2xl border px-3 py-2.5 text-sm ${
                    secondsLeft <= 30
                      ? 'border-amber-200 bg-amber-50 text-amber-950'
                      : 'border-primary-200/60 bg-primary-50/80 text-slate-800'
                  }`}
                >
                  <p>
                    Solicite a <strong>{data?.nombre}</strong> los datos del registro. Esta solicitud caduca en{' '}
                    <strong>{secondsLeft}s</strong> (indicador en pantalla; vuelva a abrir si expira).
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Documento completo</label>
                    <input
                      value={docForm}
                      onChange={(e) => setDocForm(e.target.value)}
                      disabled={bloqueadoTiempo}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
                    />
                  </div>
                  {modal === 'presencial' && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Teléfono / WhatsApp</label>
                      <input
                        value={telForm}
                        onChange={(e) => setTelForm(e.target.value)}
                        disabled={bloqueadoTiempo}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">¿Cómo nos conoció?</label>
                    <select
                      value={marketing}
                      onChange={(e) => setMarketing(e.target.value)}
                      disabled={bloqueadoTiempo}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                    >
                      <option value="">Seleccione…</option>
                      {MARKETING.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  {modal === 'presencial' && (
                    <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        disabled={bloqueadoTiempo}
                        className="mt-1 rounded border-slate-300 text-primary-600"
                      />
                      <span>Confirmo que el propietario aportó los datos y aceptó los términos aplicables.</span>
                    </label>
                  )}
                </div>

                {submitErr && (
                  <p className="mt-3 text-sm text-red-600" role="alert">
                    {submitErr}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" className="rounded-xl" onClick={() => setModal('none')}>
                    Cerrar
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={submitting || bloqueadoTiempo || (modal === 'presencial' && !consent)}
                    onClick={() => void (modal === 'presencial' ? onPresencial() : onParcial())}
                  >
                    {submitting ? 'Guardando…' : 'Validar y vincular'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
