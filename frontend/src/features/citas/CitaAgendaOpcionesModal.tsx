import { useNavigate } from 'react-router-dom'
import type { Cita } from '../../api/types'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { IconArrowRight, IconCalendar, IconPencilSquare, IconConsultorio } from '../../shared/ui/icons'

function lineaResumenCita(c: Cita): string {
  const owner = c.cliente_nombre?.trim() || 'Propietario'
  const pet =
    c.mascota_nombre?.trim() || (c.mascota_id != null ? `Mascota #${c.mascota_id}` : 'Sin mascota')
  const tipo = c.motivo?.trim() || 'Cita'
  return `${owner} (${pet}) — ${tipo}`
}

type Props = {
  cita: Cita | null
  open: boolean
  onClose: () => void
}

export function CitaAgendaOpcionesModal({ cita, open, onClose }: Props) {
  const navigate = useNavigate()

  if (!cita) return null

  const c = cita
  const puedeIrMascota = c.mascota_id != null
  const from = { from: '/citas' as const }

  function irConsultorio() {
    if (!puedeIrMascota || c.mascota_id == null) return
    onClose()
    navigate(`/mascotas/${c.mascota_id}`, { state: from })
  }

  function irEditarCita() {
    onClose()
    navigate(`/citas/${c.id}`, { state: from })
  }

  function irEstadoAsistencia() {
    onClose()
    navigate(`/citas/${c.id}`, { state: { ...from, agendaFocus: 'estado' } })
  }

  return (
    <Modal
      open={open}
      title="Opciones del evento"
      onClose={onClose}
      size="md"
      headerClose={false}
    >
      <div className="flex flex-col items-center gap-5 pb-1 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-3xl font-semibold text-sky-600"
          aria-hidden
        >
          ?
        </div>
        <p className="text-base font-semibold leading-snug text-slate-900">{lineaResumenCita(c)}</p>

        <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!puedeIrMascota}
            title={!puedeIrMascota ? 'Esta cita no tiene mascota asociada' : undefined}
            onClick={irConsultorio}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            <IconConsultorio className="h-5 w-5 shrink-0 text-white" />
            Ir al consultorio
            <IconArrowRight className="h-4 w-4 shrink-0 text-white" />
          </button>
          <button
            type="button"
            onClick={irEditarCita}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <IconPencilSquare className="h-5 w-5 shrink-0 text-white" />
            Editar evento
          </button>
        </div>

        <button
          type="button"
          onClick={irEstadoAsistencia}
          className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-500"
        >
          <IconCalendar className="h-5 w-5 shrink-0 text-amber-950" />
          Estado y asistencia
        </button>

        <Button type="button" variant="secondary" className="mt-1 w-full max-w-md" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  )
}
