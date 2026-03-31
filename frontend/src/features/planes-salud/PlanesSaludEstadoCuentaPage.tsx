import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2,
  CalendarRange,
  HeartPulse,
  MapPin,
  Mail,
  PawPrint,
  Phone,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { fetchEstadoCuenta } from './api'
import { Button } from '../../shared/ui/Button'

function money(n: string | number | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : Number(n ?? 0)
  if (Number.isNaN(v)) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })
  } catch {
    return iso
  }
}

/**
 * Vista imprimible: estado de cuenta de una afiliación a plan de salud.
 */
export function PlanesSaludEstadoCuentaPage() {
  const { afiliacionId } = useParams<{ afiliacionId: string }>()
  const id = afiliacionId ? parseInt(afiliacionId, 10) : NaN
  const { data, isLoading, isError } = useQuery({
    queryKey: ['planes-salud', 'estado-cuenta', id],
    queryFn: () => fetchEstadoCuenta(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-[#f0fdfa]/40 to-slate-100 text-slate-900 print:bg-white print:from-white print:via-white print:to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 print:max-w-none print:px-6 print:py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/planes-salud"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200/80 transition hover:bg-emerald-50"
          >
            ← Volver a planes de salud
          </Link>
          <Button type="button" onClick={() => window.print()} className="rounded-xl shadow-md shadow-emerald-900/10">
            Imprimir / PDF
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 text-sm text-slate-600 shadow-sm print:hidden">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Cargando estado de cuenta…
          </div>
        )}
        {isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 print:border-red-300 print:bg-white">
            No se pudo cargar el estado de cuenta.
          </p>
        )}

        {data && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="overflow-hidden rounded-3xl border border-emerald-200/50 bg-white shadow-[0_20px_50px_-12px_rgba(5,150,105,0.18)] ring-1 ring-emerald-100/60 print:rounded-none print:shadow-none print:ring-0"
          >
            {/* Cabecera premium (pantalla); impresión en blanco con borde */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 py-7 text-white print:border-b print:border-slate-200 print:bg-white print:bg-none print:from-white print:to-white print:text-slate-900 print:px-0 print:py-4">
              <div
                className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl print:hidden"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-8 left-1/4 h-32 w-64 rounded-full bg-cyan-400/20 blur-3xl print:hidden"
                aria-hidden
              />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-50 ring-1 ring-white/25 print:hidden">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Plan de salud
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-[1.65rem] print:text-xl print:text-slate-900">
                    Estado de cuenta
                  </h1>
                  <p className="mt-1.5 text-sm font-medium text-emerald-100 print:text-slate-600">
                    Referencia <span className="tabular-nums text-white print:text-slate-900">No. {data.plan_numero}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-2xl bg-black/10 px-4 py-3 text-sm text-emerald-50 ring-1 ring-white/20 backdrop-blur-sm sm:text-right print:hidden">
                  <span className="flex items-center gap-2 font-semibold text-white sm:justify-end">
                    <Building2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    {data.clinica_nombre}
                  </span>
                  {data.clinica_direccion ? (
                    <span className="flex items-start gap-2 opacity-95 sm:justify-end">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      <span>{data.clinica_direccion}</span>
                    </span>
                  ) : null}
                  {data.clinica_telefono ? (
                    <span className="inline-flex items-center gap-2 sm:ml-auto">
                      <Phone className="h-3.5 w-3.5 opacity-80" aria-hidden />
                      {data.clinica_telefono}
                    </span>
                  ) : null}
                  {data.clinica_email ? (
                    <span className="inline-flex items-center gap-2 break-all sm:ml-auto">
                      <Mail className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      {data.clinica_email}
                    </span>
                  ) : null}
                </div>
                {/* Bloque clínica solo impresión (texto plano) */}
                <div className="hidden text-right text-sm text-slate-600 print:block">
                  <p className="font-semibold text-slate-900">{data.clinica_nombre}</p>
                  {data.clinica_direccion ? <p>{data.clinica_direccion}</p> : null}
                  {data.clinica_telefono ? <p>Tel. {data.clinica_telefono}</p> : null}
                  {data.clinica_email ? <p>{data.clinica_email}</p> : null}
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6 sm:p-8 print:space-y-5 print:p-0 print:pt-5">
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white p-4 shadow-sm ring-1 ring-slate-100/80 print:border-slate-200 print:shadow-none print:ring-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 print:bg-slate-100 print:text-slate-700">
                    <UserRound className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titular</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {data.titular_documento ? `${data.titular_documento} · ` : ''}
                      {data.titular_nombre ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white p-4 shadow-sm ring-1 ring-slate-100/80 print:border-slate-200 print:shadow-none print:ring-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 print:bg-slate-100 print:text-slate-700">
                    <PawPrint className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mascota</p>
                    <p className="mt-1 font-semibold text-slate-900">{data.mascota_nombre ?? '—'}</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50/50 via-white to-cyan-50/40 p-4 shadow-sm ring-1 ring-emerald-100/60 sm:col-span-2 print:border-slate-200 print:shadow-none print:ring-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-sm">
                    <HeartPulse className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">Plan contratado</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{data.plan_nombre}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-emerald-100 print:ring-slate-200">
                        <CalendarRange className="h-3.5 w-3.5 text-emerald-600 print:text-slate-600" aria-hidden />
                        {formatDate(data.vigencia_desde)} — {formatDate(data.vigencia_hasta)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700 print:text-slate-800">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-200 to-transparent print:via-slate-300" />
                  Cobertura y disponibilidad
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent via-emerald-200 to-transparent print:via-slate-300" />
                </h2>
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/30 shadow-inner print:rounded-lg print:border-slate-300 print:bg-white">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-800 via-slate-800 to-emerald-900 text-left text-white print:from-slate-100 print:via-slate-100 print:to-slate-100 print:text-slate-900">
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-100 print:text-slate-700">
                          Servicio
                        </th>
                        <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-100 print:text-slate-700">
                          Avance
                        </th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-emerald-100 print:text-slate-700">
                          Disponible
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {data.lineas.map((linea, i) => {
                        const limite = Math.max(1, linea.limite || 1)
                        const pct = Math.min(100, (linea.consumidos / limite) * 100)
                        return (
                          <tr
                            key={`${linea.nombre_servicio}-${i}`}
                            className="border-b border-slate-100 transition-colors last:border-0 hover:bg-emerald-50/20 print:hover:bg-transparent"
                          >
                            <td className="px-4 py-3.5 font-medium text-slate-900">{linea.nombre_servicio}</td>
                            <td className="px-4 py-3.5">
                              <div className="max-w-[220px] print:max-w-none">
                                <div className="mb-1 flex justify-between text-xs text-slate-500 print:hidden">
                                  <span>
                                    {linea.consumidos} de {linea.limite}
                                  </span>
                                  <span className="tabular-nums">{Math.round(pct)}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-200/90 print:hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="hidden text-slate-600 print:inline">—</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right text-sm tabular-nums text-slate-800">
                              <span className="font-semibold text-emerald-800 print:text-slate-900">
                                {linea.consumidos}/{linea.limite}
                              </span>
                              {linea.cobertura_maxima != null && Number(linea.cobertura_maxima) > 0 ? (
                                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                  · máx. {money(linea.cobertura_maxima)}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-center text-xs leading-relaxed text-slate-500 print:border-slate-300 print:bg-white print:text-[10px]">
                Documento informativo. Los consumos se registran al aplicar beneficios en consulta o venta (próximas
                versiones).
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
