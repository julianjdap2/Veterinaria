import type { TipoServicioCita } from '../../api/types'

const FALLBACK_LABELS: Record<string, string> = {
  consulta: 'Consulta',
  vacuna: 'Vacunación',
  cirugia: 'Cirugía',
  peluqueria: 'Peluquería / baño',
}

export function labelTipoServicio(
  motivo: string | null | undefined,
  tipos?: TipoServicioCita[] | null,
): string {
  const v = (motivo ?? '').trim()
  if (!v) return '—'
  const t = tipos?.find((x) => x.id === v)
  if (t) return t.label
  return FALLBACK_LABELS[v] ?? v
}

export function duracionTipoServicio(
  motivo: string | null | undefined,
  tipos?: TipoServicioCita[] | null,
): string {
  const v = (motivo ?? '').trim()
  const t = tipos?.find((x) => x.id === v)
  const min = t?.duracion_min ?? 30
  return `${min} min`
}

export function flagsTipoServicio(
  tipoId: string,
  tipos?: TipoServicioCita[] | null,
): { allowUrgente: boolean } {
  const t = tipos?.find((x) => x.id === tipoId)
  return {
    allowUrgente: t?.allow_urgente ?? true,
  }
}

export function citaEsHistorica(cita: {
  fecha: string | null
  estado: string | null
}): boolean {
  const st = (cita.estado ?? '').trim()
  if (st === 'atendida' || st === 'cancelada') return true
  if (cita.fecha) {
    const end = new Date(cita.fecha)
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) return true
  }
  return false
}
