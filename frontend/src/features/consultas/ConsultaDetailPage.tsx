import { useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useConsultaDetail, useResumenConsulta, useFormula } from './hooks/useConsultaDetail'
import {
  downloadResumenPdf,
  enviarResumenEmail,
  addFormulaItem,
  deleteFormulaItem,
  fetchAsistenteClinico,
} from './api'
import { useProductos } from '../productos/hooks/useProductos'
import { useCitaDetail } from '../citas/hooks/useCitasAgenda'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Input } from '../../shared/ui/Input'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import type { FormulaItemCreate } from '../../api/types'
import { PAGE_SIZE_SELECT, SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from '../../core/listDefaults'
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '../../shared/ui/Table'

const defaultFormulaForm: FormulaItemCreate = {
  producto_id: 0,
  presentacion: '',
  observacion: '',
  cantidad: 1,
}

export function ConsultaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const consultaId = id ? parseInt(id, 10) : null
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const rolId = user?.rolId ?? 0
  const isVet = rolId === ROLES.VETERINARIO
  const puedeRegistrarVentaPorRol = rolId === ROLES.ADMIN || rolId === ROLES.RECEPCION

  const { data: consulta, isLoading, isError } = useConsultaDetail(consultaId)
  const asistenteQ = useQuery({
    queryKey: ['consultas', consultaId, 'asistente-clinico'],
    queryFn: () => fetchAsistenteClinico(consultaId!),
    enabled: consultaId != null,
    retry: false,
  })
  const { data: resumen, isLoading: loadingResumen } = useResumenConsulta(consultaId)
  const { data: formula = [], isLoading: loadingFormula } = useFormula(consultaId)
  const { data: citaDetalle } = useCitaDetail(consulta?.cita_id ?? null)
  const puedeRegistrarVenta =
    consulta?.cita_id == null ? puedeRegistrarVentaPorRol : citaDetalle?.estado === 'atendida' && puedeRegistrarVentaPorRol
  const isAdmin = rolId === ROLES.ADMIN

  const [showAddForm, setShowAddForm] = useState(false)
  const [prodFilter, setProdFilter] = useState('')
  const debouncedProd = useDebouncedValue(prodFilter.trim(), SEARCH_DEBOUNCE_MS)
  const needProductos = isVet && (formula.length === 0 || showAddForm)
  const { data: productosData } = useProductos(
    {
      page: 1,
      page_size: PAGE_SIZE_SELECT,
      incluir_inactivos: false,
      search: debouncedProd.length >= SEARCH_MIN_CHARS ? debouncedProd : undefined,
    },
    { enabled: needProductos }
  )
  const productos = productosData?.items ?? []

  const [downloading, setDownloading] = useState(false)
  const [sending, setSending] = useState(false)
  const [formulaForm, setFormulaForm] = useState<FormulaItemCreate>(defaultFormulaForm)
  const [addingFormula, setAddingFormula] = useState(false)
  const [moduloActivo, setModuloActivo] = useState('datos')
  const formulaDeepLinkDone = useRef(false)

  useEffect(() => {
    formulaDeepLinkDone.current = false
  }, [consultaId])

  useEffect(() => {
    if (!consulta || formulaDeepLinkDone.current) return
    const st = location.state as { moduloInicial?: string } | null | undefined
    if (st?.moduloInicial === 'formula') {
      formulaDeepLinkDone.current = true
      setModuloActivo('formula')
      const t = window.setTimeout(() => {
        document.getElementById('consulta-modulo-formula')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
      return () => window.clearTimeout(t)
    }
  }, [consulta, location.state])

  const modulos = [
    { id: 'datos', label: 'Datos de consulta' },
    { id: 'asistente', label: 'Asistente clínico' },
    { id: 'resumen', label: 'Resumen y PDF' },
    { id: 'formula', label: 'Fórmula médica' },
  ]

  if (consultaId == null || isError || (!isLoading && !consulta)) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Consulta no encontrada.</p>
        <Link to="/mascotas" className="text-primary-600 hover:underline text-sm">
          ← Volver a mascotas
        </Link>
      </div>
    )
  }

  if (isLoading || !consulta) {
    return <p className="text-gray-500">Cargando...</p>
  }

  async function handleDescargarPdf() {
    if (consultaId == null) return
    setDownloading(true)
    try {
      await downloadResumenPdf(consultaId)
      toast.success('PDF descargado')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al descargar PDF.'
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  async function handleEnviarEmail() {
    if (consultaId == null) return
    setSending(true)
    try {
      await enviarResumenEmail(consultaId)
      toast.success('Resumen enviado por email al cliente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al enviar el email.'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  async function handleAddFormula(e: React.FormEvent) {
    e.preventDefault()
    if (consultaId == null || !formulaForm.producto_id) return
    setAddingFormula(true)
    try {
      await addFormulaItem(consultaId, {
        producto_id: formulaForm.producto_id,
        presentacion: formulaForm.presentacion || undefined,
        observacion: formulaForm.observacion || undefined,
        cantidad: formulaForm.cantidad || 1,
      })
      queryClient.invalidateQueries({ queryKey: ['consultas', 'formula', consultaId] })
      setFormulaForm(defaultFormulaForm)
      setShowAddForm(false)
      toast.success('Medicamento añadido a la fórmula')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al añadir')
    } finally {
      setAddingFormula(false)
    }
  }

  async function handleDeleteFormulaItem(itemId: number) {
    if (consultaId == null) return
    try {
      await deleteFormulaItem(consultaId, itemId)
      queryClient.invalidateQueries({ queryKey: ['consultas', 'formula', consultaId] })
      toast.success('Ítem quitado de la fórmula')
    } catch {
      toast.error('Error al quitar')
    }
  }

  function handleRegistrarVenta() {
    if (formula.length === 0) return
        navigate('/ventas/nueva', {
      state: {
        consultaId,
        formulaItems: formula.map((f) => ({
          producto_id: f.producto_id,
          cantidad: f.cantidad,
          precio_unitario: undefined,
        })),
      },
    })
  }

  function navegarModulo(moduloId: string) {
    setModuloActivo(moduloId)
    const el = document.getElementById(`consulta-modulo-${moduloId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[
          { label: 'Mascota', to: `/mascotas/${consulta.mascota_id}` },
          { label: `Consulta #${consulta.id}` },
        ]}
        title={`Consulta #${consulta.id}`}
        subtitle={resumen?.mascota_nombre ? `Paciente: ${resumen.mascota_nombre}` : undefined}
        actions={
          <Link
            to={`/mascotas/${consulta.mascota_id}`}
            className="text-sm font-medium text-primary-600 hover:text-primary-800"
          >
            ← Volver a mascota
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card title="Historia clínica">
            <nav className="space-y-1">
              {modulos.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => navegarModulo(m.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    moduloActivo === m.id
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </nav>
          </Card>
        </aside>
        <div className="space-y-6">
      <div id="consulta-modulo-datos">
      <Card title="Datos de la consulta">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Mascota</dt>
            <dd className="mt-0.5">
              <Link
                to={`/mascotas/${consulta.mascota_id}`}
                className="text-primary-600 hover:underline"
              >
                {resumen?.mascota_nombre ?? `#${consulta.mascota_id}`}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Fecha</dt>
            <dd className="mt-0.5 text-gray-900">
              {resumen?.fecha_consulta ?? (consulta.fecha_consulta || consulta.created_at) ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Motivo</dt>
            <dd className="mt-0.5 text-gray-900">{consulta.motivo_consulta ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Variables clínicas</dt>
            <dd className="mt-0.5 whitespace-pre-line text-gray-900">{resumen?.extras_clinicos_texto || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Diagnóstico</dt>
            <dd className="mt-0.5 text-gray-900">{consulta.diagnostico ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Tratamiento</dt>
            <dd className="mt-0.5 text-gray-900">{consulta.tratamiento ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Observaciones</dt>
            <dd className="mt-0.5 text-gray-900">{consulta.observaciones ?? '—'}</dd>
          </div>
        </dl>
      </Card>
      </div>

      <div id="consulta-modulo-asistente">
      <Card title="Asistente clínico (sugerencias)">
        {asistenteQ.isLoading && <p className="text-sm text-gray-500">Cargando sugerencias…</p>}
        {asistenteQ.isError && (
          <div className="text-sm">
            {asistenteQ.error instanceof ApiError && asistenteQ.error.isForbidden ? (
              <div className="space-y-2">
                <p className="text-slate-600">
                  El asistente de consultorio no está activo en el plan SaaS de tu clínica, o fue deshabilitado.
                </p>
                {isAdmin ? (
                  <Link
                    to="/planes-suscripcion"
                    className="font-medium text-primary-600 hover:underline"
                  >
                    Ver planes y suscripción
                  </Link>
                ) : (
                  <p className="text-xs text-slate-500">Pide a un administrador que revise el plan contratado.</p>
                )}
              </div>
            ) : (
              <p className="text-red-600">No se pudieron cargar las sugerencias.</p>
            )}
          </div>
        )}
        {asistenteQ.data && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {asistenteQ.data.mascota_nombre} · {asistenteQ.data.edad_texto}
              {asistenteQ.data.especie ? ` · ${asistenteQ.data.especie}` : ''}
            </p>
            {asistenteQ.data.modelo_llm ? (
              <p className="mb-2 text-xs font-medium text-primary-800/90">
                Incluye sugerencias del modelo: {asistenteQ.data.modelo_llm}
              </p>
            ) : null}
            <ul className="space-y-3">
              {asistenteQ.data.items.map((it, i) => (
                <li
                  key={`${it.titulo}-${i}`}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-800">{it.titulo}</span>
                  <span className="ml-2 text-xs uppercase tracking-wide text-slate-400">{it.categoria}</span>
                  <p className="mt-1 text-slate-600">{it.detalle}</p>
                </li>
              ))}
            </ul>
            <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">{asistenteQ.data.aviso_legal}</p>
          </div>
        )}
      </Card>
      </div>

      <div id="consulta-modulo-resumen">
      <Card
        title="Resumen de consulta"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={handleDescargarPdf}
              loading={downloading}
              disabled={loadingResumen}
            >
              Descargar PDF
            </Button>
            <Button
              variant="secondary"
              onClick={handleEnviarEmail}
              loading={sending}
              disabled={loadingResumen || !resumen?.cliente_email}
              title={
                !resumen?.cliente_email
                  ? 'El cliente no tiene email registrado'
                  : 'Envía el resumen al email del cliente'
              }
            >
              Enviar por email al cliente
            </Button>
          </div>
        }
      >
        {loadingResumen && <p className="text-sm text-gray-500">Cargando resumen...</p>}
        {!loadingResumen && resumen && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium text-gray-600">Cliente:</span>{' '}
              {resumen.cliente_nombre}
              {resumen.cliente_email && (
                <span className="text-gray-500"> ({resumen.cliente_email})</span>
              )}
            </p>
            <p>
              <span className="font-medium text-gray-600">Veterinario:</span>{' '}
              {resumen.veterinario_nombre}
            </p>
            <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
              <p><span className="font-medium text-gray-600">Motivo:</span> {resumen.motivo_consulta}</p>
              <p>
                <span className="font-medium text-gray-600">Variables clínicas:</span>{' '}
                <span className="whitespace-pre-line">{resumen.extras_clinicos_texto || '—'}</span>
              </p>
              <p><span className="font-medium text-gray-600">Diagnóstico:</span> {resumen.diagnostico}</p>
              <p><span className="font-medium text-gray-600">Tratamiento:</span> {resumen.tratamiento}</p>
              <p><span className="font-medium text-gray-600">Notas de la cita:</span> {resumen.notas_cita}</p>
              <p><span className="font-medium text-gray-600">Observaciones:</span> {resumen.observaciones}</p>
            </div>
          </div>
        )}
      </Card>
      </div>

      <div id="consulta-modulo-formula">
      <Card title="Fórmula médica">
        {loadingFormula && <p className="text-sm text-gray-500">Cargando fórmula...</p>}
        {!loadingFormula && formula.length === 0 && !isVet && (
          <p className="text-sm text-gray-500">El veterinario no ha añadido medicamentos a la fórmula.</p>
        )}
        {!loadingFormula && formula.length === 0 && isVet && (
          <p className="text-sm text-gray-500">Añade medicamentos con presentación y observación de uso.</p>
        )}

        {isVet && formula.length > 0 && (
          <div className="mb-4">
            <Button variant="secondary" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? 'Ocultar' : 'Añadir otro medicamento'}
            </Button>
          </div>
        )}

        {isVet && (formula.length === 0 || showAddForm) && (
          <form onSubmit={handleAddFormula} className="mb-4 p-3 rounded-xl bg-slate-50 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Buscar medicamento</label>
              <input
                type="search"
                value={prodFilter}
                onChange={(e) => setProdFilter(e.target.value)}
                placeholder={`Opcional: refina con ${SEARCH_MIN_CHARS}+ caracteres (por defecto se listan ${PAGE_SIZE_SELECT})`}
                className="w-full max-w-lg rounded-xl border border-slate-300 px-3 py-2 text-sm"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Medicamento</label>
                <select
                  value={formulaForm.producto_id || ''}
                  onChange={(e) => {
                    const newId = parseInt(e.target.value, 10) || 0
                    const p = productos.find((x) => x.id === newId)
                    setFormulaForm((f) => ({
                      ...f,
                      producto_id: newId,
                      presentacion: p?.presentacion ?? f.presentacion,
                    }))
                  }}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Presentación"
                placeholder="Ej. 100mg x 30 comp"
                value={formulaForm.presentacion ?? ''}
                onChange={(e) => setFormulaForm((f) => ({ ...f, presentacion: e.target.value }))}
              />
              <Input
                type="number"
                min="1"
                label="Cantidad"
                value={formulaForm.cantidad ?? 1}
                onChange={(e) =>
                  setFormulaForm((f) => ({ ...f, cantidad: parseInt(e.target.value, 10) || 1 }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Observación (cómo aplicar)</label>
              <input
                type="text"
                placeholder="Ej. 1 comprimido cada 12 horas por 7 días"
                value={formulaForm.observacion ?? ''}
                onChange={(e) => setFormulaForm((f) => ({ ...f, observacion: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" loading={addingFormula} disabled={!formulaForm.producto_id}>
              Añadir a la fórmula
            </Button>
          </form>
        )}

        {formula.length > 0 && (
          <Table plain className="w-full text-sm">
            <TableHead>
              <TableRow header>
                <TableTh className="!pb-2 !pr-4">Medicamento</TableTh>
                <TableTh className="!pb-2 !pr-4">Presentación</TableTh>
                <TableTh className="w-20 !pb-2 !pr-4">Cant.</TableTh>
                <TableTh className="!pb-2 !pr-4">Observación (cómo aplicar)</TableTh>
                {isVet && (
                  <TableTh className="w-16 !pb-2 !pr-4">
                    <span className="sr-only">Acciones</span>
                  </TableTh>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {formula.map((f) => (
                <TableRow key={f.id}>
                  <TableTd className="!py-2 !pr-4 font-medium">{f.producto_nombre ?? '—'}</TableTd>
                  <TableTd className="!py-2 !pr-4">{f.presentacion ?? '—'}</TableTd>
                  <TableTd className="!py-2 !pr-4">{f.cantidad}</TableTd>
                  <TableTd className="max-w-[200px] !py-2 !pr-4 truncate" title={f.observacion ?? ''}>
                    {f.observacion ?? '—'}
                  </TableTd>
                  {isVet && (
                    <TableTd className="!py-2 !pr-4">
                      <button
                        type="button"
                        onClick={() => handleDeleteFormulaItem(f.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    </TableTd>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {puedeRegistrarVenta && formula.length > 0 && (
          <div className="mt-4">
            <Button onClick={handleRegistrarVenta}>
              Registrar venta desde fórmula
            </Button>
          </div>
        )}
      </Card>
      </div>
      </div>
      </div>
    </div>
  )
}
