/** Formatea fecha de venta desde API (ISO string u otros formatos comunes). */
export function formatVentaFecha(value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  }
  return '—'
}
