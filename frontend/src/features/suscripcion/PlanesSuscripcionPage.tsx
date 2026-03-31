import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchMiSuscripcion } from './api'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import type { PlanCatalogoItem } from '../../api/types'
import { useState, useMemo } from 'react'

function moneyCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function limiteEtiqueta(v: number | null | undefined, sufijo: string): string {
  if (v == null) return `Sin límite de ${sufijo}`
  return `Hasta ${v.toLocaleString('es-CO')} ${sufijo}`
}

function bulletsPlan(p: PlanCatalogoItem): string[] {
  const lines: string[] = []
  lines.push(limiteEtiqueta(p.max_usuarios, 'usuarios'))
  lines.push(limiteEtiqueta(p.max_mascotas, 'mascotas activas'))
  lines.push(limiteEtiqueta(p.max_citas_mes, 'citas al mes'))
  if (p.modulo_agenda) lines.push('Agenda y citas')
  if (p.modulo_inventario) lines.push('Inventario')
  if (p.modulo_ventas) lines.push('Ventas y POS')
  if (p.modulo_reportes) lines.push('Reportes')
  if (p.feature_dashboard_avanzado) lines.push('Dashboard avanzado')
  else lines.push('Dashboard estándar')
  if (p.feature_exportaciones) lines.push('Exportaciones (CSV / datos)')
  if (p.modulo_facturacion_electronica) lines.push('Facturación electrónica (preparación DIAN)')
  if (p.modulo_marketing) lines.push('Módulo marketing')
  if (p.modulo_whatsapp) lines.push('Integración WhatsApp')
  if (p.feature_recordatorios_automaticos) lines.push('Recordatorios automáticos')
  if (p.feature_ia_consultorio) lines.push('Asistente en consultorio (checklist y sugerencias por reglas)')
  lines.push(`Soporte: ${p.soporte_nivel === 'premium' ? 'prioritario' : 'estándar'}`)
  return lines
}

/**
 * Suscripción al **software** (SaaS). Distinto de `/planes-salud` (paquetes para mascotas de la clínica).
 */
export function PlanesSuscripcionPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['empresa', 'suscripcion'],
    queryFn: fetchMiSuscripcion,
  })

  const [ciclo, setCiclo] = useState<'mes' | 'anio'>('mes')

  const anualAhorro = 0.15

  const precioMostrado = useMemo(() => {
    return (precioMensual: number) => {
      if (ciclo === 'mes') return precioMensual
      return Math.round(precioMensual * 12 * (1 - anualAhorro))
    }
  }, [ciclo])

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', to: '/dashboard' },
          { label: 'Administración', to: '/configuracion-operativa' },
          { label: 'Planes y suscripción' },
        ]}
        title="Planes y suscripción"
        subtitle="Tu plan del software veterinario (OkVet-style: límites, módulos y soporte). Distinto de los paquetes de salud para mascotas."
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              to="/planes-salud"
              className="font-medium text-primary-700 underline-offset-2 hover:underline"
              title="Paquetes de servicios que vendes a tus clientes"
            >
              → Planes de salud (mascotas)
            </Link>
          </div>
        }
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-primary-700 to-slate-900 px-6 py-10 text-white shadow-xl">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10c5 8 10 15 10 20a10 10 0 11-20 0c0-5 5-12 10-20z' fill='%23fff'/%3E%3C/svg%3E")`,
            backgroundSize: '80px 80px',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Planes &amp; suscripciones</h2>
          <p className="mt-2 text-sm text-sky-100 sm:text-base">
            Accede a funcionalidades según el plan contratado para <strong>{data?.empresa_nombre ?? 'tu clínica'}</strong>
            {data?.empresa_estado && data.empresa_estado !== 'activa' ? (
              <span className="block text-amber-200">Estado cuenta: {data.empresa_estado}</span>
            ) : null}
          </p>
          <p className="mt-4 text-sm text-sky-200">
            ¿Código de descuento?{' '}
            <button
              type="button"
              disabled
              className="font-semibold text-white underline decoration-dotted opacity-70"
              title="Próximamente"
            >
              Ingresar código
            </button>{' '}
            <span className="text-sky-300/80">(próximamente)</span>
          </p>

          <div className="mt-6 inline-flex rounded-full bg-white/10 p-1 ring-1 ring-white/20">
            <button
              type="button"
              onClick={() => setCiclo('mes')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                ciclo === 'mes' ? 'bg-white text-primary-800 shadow' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              Un mes
            </button>
            <button
              type="button"
              onClick={() => setCiclo('anio')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                ciclo === 'anio' ? 'bg-white text-primary-800 shadow' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              12 meses (−15%)
            </button>
          </div>
        </div>
      </section>

      {isLoading && <p className="text-sm text-slate-500">Cargando planes…</p>}
      {isError && <p className="text-sm text-red-600">No se pudo cargar la suscripción. ¿Tienes rol administrador?</p>}

      {data && data.planes_catalogo.length === 0 && (
        <Card className="p-6 text-center text-slate-600">
          Aún no hay planes configurados en el catálogo. Contacta al equipo de la plataforma.
        </Card>
      )}

      {data && data.planes_catalogo.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.planes_catalogo.map((plan) => {
            const esActual = data.plan_actual_id === plan.id
            const total = precioMostrado(Number(plan.precio))
            const esGratis = Number(plan.precio) <= 0

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col overflow-hidden border-2 p-0 shadow-lg ${
                  esActual ? 'border-primary-400 ring-2 ring-primary-200' : 'border-slate-200'
                }`}
              >
                {esActual ? (
                  <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      Plan actual
                    </span>
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col px-6 pb-6 pt-10">
                  <div className="mb-2 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Plan</span>
                    <h3 className="text-xl font-bold text-slate-900">{plan.nombre}</h3>
                    <p className="text-sm text-slate-500">{plan.codigo}</p>
                  </div>

                  <div className="my-4 rounded-2xl bg-slate-900 py-4 text-center text-white">
                    {esGratis ? (
                      <p className="text-3xl font-bold">Gratis</p>
                    ) : (
                      <>
                        <p className="text-2xl font-bold tabular-nums">{moneyCOP(total)}</p>
                        <p className="text-xs text-slate-300">
                          {ciclo === 'mes' ? 'al mes (referencia)' : 'pago anual estimado (referencia)'}
                        </p>
                      </>
                    )}
                  </div>

                  <p className="mb-4 text-center text-xs text-slate-500">
                    Los límites y módulos se aplican a toda tu clínica. El detalle exacto de facturación lo coordina el
                    equipo comercial.
                  </p>

                  <ul className="flex-1 space-y-2 text-sm text-slate-700">
                    {bulletsPlan(plan).map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-primary-600">✓</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <Button type="button" variant="secondary" className="w-full" disabled={esActual}>
                      {esActual ? 'Plan activo' : 'Solicitar cambio de plan'}
                    </Button>
                    <p className="mt-2 text-center text-xs text-slate-500">
                      Mejora frente a competidores: IA en consultorio, paquetes de mascotas nativos y API abierta (roadmap).
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="border-primary-100 bg-primary-50/40 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Cómo nos diferenciamos (vs. típicos como OkVet)</h3>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>
            <strong>Planes de salud (mascotas)</strong> integrados en el mismo producto: paquetes, coberturas y afiliados
            por tenant — no solo el SaaS.
          </li>
          <li>
            <strong>IA en consulta (roadmap):</strong> sugerencias según hallazgos, recordatorios de dosis y redacción de
            resúmenes clínicos con control del veterinario.
          </li>
          <li>
            <strong>Transparencia:</strong> límites y flags por plan enlazados a datos reales (`planes` en BD), no solo
            marketing.
          </li>
        </ul>
      </Card>
    </div>
  )
}
