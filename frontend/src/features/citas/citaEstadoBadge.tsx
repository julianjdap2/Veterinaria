/**
 * Pastilla de estado de cita (listados, agenda, ficha de mascota).
 */
export function estadoCitaBadgeMeta(estado: string | null | undefined): { label: string; className: string } {
  const e = estado ?? 'pendiente'
  if (e === 'atendida') {
    return { label: 'Finalizada', className: 'bg-emerald-100 text-emerald-800 ring-emerald-300' }
  }
  if (e === 'cancelada') {
    return { label: 'Cancelada', className: 'bg-red-100 text-red-800 ring-red-300' }
  }
  if (e === 'confirmada') {
    return { label: 'Confirmada', className: 'bg-sky-100 text-sky-800 ring-sky-300' }
  }
  if (e === 'revision') {
    return { label: 'En curso', className: 'bg-teal-100 text-teal-800 ring-teal-300' }
  }
  return { label: 'Pendiente', className: 'bg-amber-100 text-amber-900 ring-amber-300' }
}

export function CitaEstadoBadge({ estado }: { estado: string | null | undefined }) {
  const { label, className } = estadoCitaBadgeMeta(estado)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${className}`}
    >
      {label}
    </span>
  )
}
