import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CalendarClock,
  Download,
  FileText,
  MessageSquare,
  MoreHorizontal,
  PawPrint,
  Pill,
  Stethoscope,
} from 'lucide-react'
import type { Mascota, Consulta, Cita, Cliente } from '../../../api/types'
import { fetchFormula } from '../../consultas/api'
import type { FormulaItem } from '../../../api/types'
import {
  loadMascotaExtras,
  mergeMascotaExtras,
  type MascotaDatosGenerales,
  type MascotaExtrasFlags,
} from '../mascotaExtrasStorage'
import { MascotaAvatar } from './MascotaAvatar'
import { EditarMascotaBasicaModal } from './EditarMascotaBasicaModal'
import { MascotaDatosGeneralesModal } from './MascotaDatosGeneralesModal'
import { MascotaNotasModal } from './MascotaNotasModal'
import { Button } from '../../../shared/ui/Button'

function formatDateTime(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return s
  }
}

function formatDateShort(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return s
  }
}

function edadDesdeNacimiento(iso: string | null): string {
  if (!iso) return '—'
  try {
    const n = new Date(iso)
    const now = new Date()
    let years = now.getFullYear() - n.getFullYear()
    let months = now.getMonth() - n.getMonth()
    let days = now.getDate() - n.getDate()
    if (days < 0) months -= 1
    if (months < 0) {
      years -= 1
      months += 12
    }
    if (years > 0) return `${years} año${years !== 1 ? 's' : ''}, ${months} mes${months !== 1 ? 'es' : ''}`
    return `${months} mes${months !== 1 ? 'es' : ''}`
  } catch {
    return '—'
  }
}

function trunc(s: string | null | undefined, n: number): string {
  if (s == null || s === '') return '—'
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : `${t.slice(0, n)}…`
}

type TimelineKind = 'consulta' | 'cita' | 'formula'

type TimelineRow = {
  kind: TimelineKind
  id: string
  fecha: string | null
  consulta?: Consulta
  cita?: Cita
  formulaItems?: FormulaItem[]
  vetNombre?: string
}

type Props = {
  mascota: Mascota
  cliente: Cliente | null | undefined
  especieNombre: string | null
  razaNombre: string | null
  consultas: Consulta[]
  citas: Cita[]
  nombreVeterinario: Map<number, string>
}

export function MascotaHistoriaPanel({
  mascota,
  cliente,
  especieNombre,
  razaNombre,
  consultas,
  citas,
  nombreVeterinario,
}: Props) {
  const [extras, setExtras] = useState(() => loadMascotaExtras(mascota.id))
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalBasica, setModalBasica] = useState(false)
  const [modalDatosGen, setModalDatosGen] = useState(false)
  const [modalNotas, setModalNotas] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setExtras(loadMascotaExtras(mascota.id))
  }, [mascota.id])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const flags: MascotaExtrasFlags = extras.flags ?? {}

  const formulaQueries = useQueries({
    queries: consultas.map((c) => ({
      queryKey: ['consultas', 'formula', c.id] as const,
      queryFn: () => fetchFormula(c.id),
    })),
  })

  const formulaByConsultaId = useMemo(() => {
    const m = new Map<number, FormulaItem[]>()
    consultas.forEach((c, i) => {
      const data = formulaQueries[i]?.data
      if (data && data.length > 0) m.set(c.id, data)
    })
    return m
  }, [consultas, formulaQueries])

  const timelineRows: TimelineRow[] = useMemo(() => {
    const rows: TimelineRow[] = []
    for (const c of consultas) {
      const vet = nombreVeterinario.get(c.veterinario_id) ?? '—'
      rows.push({
        kind: 'consulta',
        id: `consulta-${c.id}`,
        fecha: c.fecha_consulta ?? c.created_at ?? null,
        consulta: c,
        vetNombre: vet,
      })
      const items = formulaByConsultaId.get(c.id)
      if (items && items.length > 0) {
        rows.push({
          kind: 'formula',
          id: `formula-${c.id}`,
          fecha: c.fecha_consulta ?? c.created_at ?? null,
          consulta: c,
          formulaItems: items,
          vetNombre: vet,
        })
      }
    }
    for (const c of citas) {
      rows.push({
        kind: 'cita',
        id: `cita-${c.id}`,
        fecha: c.fecha ?? null,
        cita: c,
        vetNombre: c.veterinario_nombre ?? (c.veterinario_id != null ? nombreVeterinario.get(c.veterinario_id) : undefined) ?? '—',
      })
    }
    rows.sort((a, b) => {
      const ta = a.fecha ? new Date(a.fecha).getTime() : 0
      const tb = b.fecha ? new Date(b.fecha).getTime() : 0
      return tb - ta
    })
    return rows
  }, [consultas, citas, formulaByConsultaId, nombreVeterinario])

  function exportSnapshot() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            mascota,
            cliente,
            consultas,
            citas,
            extras,
            exportado: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mascota_${mascota.nombre}_${mascota.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pesoVal = mascota.peso != null ? Number(mascota.peso) : null
  const datosG: MascotaDatosGenerales = extras.datosGenerales ?? {}

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card ring-1 ring-slate-100/80"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/90 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#26a69a]/15 text-[#26a69a]">
              <PawPrint className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Datos generales de {mascota.nombre}</h2>
              <p className="text-xs text-slate-500">
                Tutor: {cliente?.nombre ?? '—'}
                {cliente?.documento ? ` · ${cliente.documento}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#26a69a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20897f]"
              >
                <span>Editar mascota</span>
                <span className="text-white/90">▾</span>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-1 min-w-[240px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setMenuOpen(false)
                      setModalBasica(true)
                    }}
                  >
                    <PawPrint className="h-4 w-4 text-slate-500" />
                    Información básica
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setMenuOpen(false)
                      setModalDatosGen(true)
                    }}
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    Editar datos generales
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setMenuOpen(false)
                      setModalNotas(true)
                    }}
                  >
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                    Notas importantes
                  </button>
                </div>
              ) : null}
            </div>
            <Button type="button" variant="secondary" className="gap-2 rounded-lg border-primary-200 text-primary-800" onClick={exportSnapshot}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[auto_1fr_260px]">
          <MascotaAvatar
            especieNombre={especieNombre}
            fotoDataUrl={extras.fotoDataUrl ?? undefined}
            onFotoChange={(url) => {
              const next = mergeMascotaExtras(mascota.id, { fotoDataUrl: url })
              setExtras(next)
            }}
          />

          <div className="min-w-0">
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
              <Field label="Especie" value={especieNombre ?? 'N/D'} />
              <Field label="Raza / subespecie" value={razaNombre ?? 'N/D'} />
              <Field label="Género" value={mascota.sexo === 'M' ? 'Macho' : mascota.sexo === 'H' ? 'Hembra' : 'N/D'} />
              <Field label="Color" value={mascota.color ?? 'N/D'} />
              <Field
                label="Peso"
                value={pesoVal != null && !Number.isNaN(pesoVal) ? `${pesoVal} kg` : 'N/D'}
              />
              <Field label="Edad" value={edadDesdeNacimiento(mascota.fecha_nacimiento)} />
              <Field label="E. reproductivo" value="N/D" />
              <Field label="Talla" value="N/D" />
              <Field label="Animal de servicio" value={flags.animalServicio ? 'Sí' : 'No'} />
              <Field label="Apoyo emocional" value={flags.apoyoEmocional ? 'Sí' : 'No'} />
              <Field label="Fallecido" value={flags.fallecido ? 'Sí' : 'No'} highlightDanger={!!flags.fallecido} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
              <p>
                <span className="font-medium text-slate-500">Alimento: </span>
                <span className="text-slate-800">{datosG.alimento ?? 'N/D'}</span>
              </p>
              <p>
                <span className="font-medium text-slate-500">Vivienda: </span>
                <span className="text-slate-800">{datosG.vivienda ?? 'N/D'}</span>
              </p>
              <p>
                <span className="font-medium text-slate-500">Cantidad alimento: </span>
                <span className="text-slate-800">{datosG.cantidadAlimento ?? 'N/D'}</span>
              </p>
              <p>
                <span className="font-medium text-slate-500">Otras mascotas: </span>
                <span className="text-slate-800">{datosG.otrasMascotas ?? 'N/D'}</span>
              </p>
            </div>
            {extras.notasImportantes ? (
              <p className="mt-3 rounded-lg bg-amber-50/80 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-100">
                <span className="font-semibold">Notas: </span>
                {extras.notasImportantes}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Histórico de peso</p>
            <div className="relative h-32 w-full">
              {pesoVal != null ? (
                <svg viewBox="0 0 200 100" className="h-full w-full text-emerald-500">
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(16 185 129 / 0.35)" />
                      <stop offset="100%" stopColor="rgb(16 185 129 / 0)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 20 70 L 100 40 L 180 55 L 180 100 L 20 100 Z"
                    fill="url(#wg)"
                    className="text-emerald-400"
                  />
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    points="20,70 100,40 180,55"
                  />
                  <text x="100" y="95" textAnchor="middle" fill="#94a3b8" fontSize="8">
                    {formatDateShort(new Date().toISOString())}
                  </text>
                </svg>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
                  Registre peso en la ficha para ver tendencia
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="relative">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Historia clínica</h3>
        {timelineRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center text-sm text-slate-500">
            Sin eventos aún. Las consultas, fórmulas y citas aparecerán aquí en orden cronológico.
          </div>
        ) : (
          <ul className="relative space-y-0 pl-0">
            <div className="absolute bottom-0 left-[19px] top-2 w-px bg-slate-200" aria-hidden />
            {timelineRows.map((row, idx) => (
              <li key={row.id} className="relative flex gap-4 pb-8 last:pb-0">
                <div className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm ring-1 ring-slate-200">
                  {row.kind === 'consulta' ? (
                    <Stethoscope className="h-5 w-5 text-primary-600" />
                  ) : row.kind === 'formula' ? (
                    <Pill className="h-5 w-5 text-violet-600" />
                  ) : (
                    <CalendarClock className="h-5 w-5 text-sky-600" />
                  )}
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-50 pb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {row.kind === 'consulta'
                          ? 'Consulta'
                          : row.kind === 'formula'
                            ? 'Fórmula médica'
                            : 'Cita'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(row.fecha)} · por {row.vetNombre ?? '—'}
                      </p>
                    </div>
                    <button type="button" className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                  {row.kind === 'consulta' && row.consulta && (
                    <div className="mt-3 space-y-1 text-sm text-slate-700">
                      <p>
                        <span className="font-medium text-slate-500">Motivo: </span>
                        {row.consulta.motivo_consulta ?? '—'}
                      </p>
                      <p>
                        <span className="font-medium text-slate-500">Examen / notas: </span>
                        {trunc(row.consulta.observaciones, 200)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-500">Diagnóstico: </span>
                        {trunc(row.consulta.diagnostico, 200)}
                      </p>
                      <p className="text-slate-400">Imágenes / adjuntos: —</p>
                      <Link to={`/consultas/${row.consulta.id}`} className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline">
                        Ver detalle
                      </Link>
                    </div>
                  )}
                  {row.kind === 'formula' && row.formulaItems && row.consulta && (
                    <div className="mt-3 space-y-1 text-sm text-slate-700">
                      <p>
                        <span className="font-medium text-slate-500">Diagnóstico: </span>
                        {trunc(row.consulta.diagnostico, 160)}
                      </p>
                      <p className="font-medium text-slate-500">Medicamentos</p>
                      <ul className="list-inside list-disc text-slate-800">
                        {row.formulaItems.map((it) => (
                          <li key={it.id}>
                            {it.producto_nombre ?? `Producto #${it.producto_id}`} × {it.cantidad}
                            {it.observacion
                              ? ` — ${trunc(it.observacion, 80)}`
                              : it.presentacion
                                ? ` (${trunc(it.presentacion, 40)})`
                                : ''}
                          </li>
                        ))}
                      </ul>
                      <Link to={`/consultas/${row.consulta.id}`} className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline">
                        Ver consulta
                      </Link>
                    </div>
                  )}
                  {row.kind === 'cita' && row.cita && (
                    <div className="mt-3 space-y-1 text-sm text-slate-700">
                      <p>
                        <span className="font-medium text-slate-500">Tipo / motivo: </span>
                        {row.cita.motivo ?? '—'}
                      </p>
                      <p>
                        <span className="font-medium text-slate-500">Estado: </span>
                        {row.cita.estado ?? '—'}
                      </p>
                      <Link
                        to={`/citas/${row.cita.id}`}
                        state={{ from: '/mascotas', mascotaId: mascota.id }}
                        className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline"
                      >
                        Ver cita
                      </Link>
                    </div>
                  )}
                </motion.div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EditarMascotaBasicaModal
        open={modalBasica}
        onClose={() => setModalBasica(false)}
        mascotaId={mascota.id}
        mascota={mascota}
        flags={flags}
        onFlagsChange={(f) => {
          const next = mergeMascotaExtras(mascota.id, { flags: f })
          setExtras(next)
        }}
      />
      <MascotaDatosGeneralesModal
        open={modalDatosGen}
        onClose={() => setModalDatosGen(false)}
        mascotaId={mascota.id}
        mascotaNombre={mascota.nombre}
        initial={datosG}
        onSaved={(dg) => {
          const next = mergeMascotaExtras(mascota.id, { datosGenerales: dg })
          setExtras(next)
        }}
      />
      <MascotaNotasModal
        open={modalNotas}
        onClose={() => setModalNotas(false)}
        mascotaId={mascota.id}
        mascotaNombre={mascota.nombre}
        initial={extras.notasImportantes ?? ''}
        onSaved={(t) => {
          const next = mergeMascotaExtras(mascota.id, { notasImportantes: t })
          setExtras(next)
        }}
      />
    </div>
  )
}

function Field({
  label,
  value,
  highlightDanger,
}: {
  label: string
  value: string
  highlightDanger?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-medium ${highlightDanger ? 'text-red-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
