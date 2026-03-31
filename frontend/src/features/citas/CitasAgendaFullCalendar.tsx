import { useCallback, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventInput, EventDropArg, DatesSetArg, EventHoveringArg } from '@fullcalendar/core'
import type { Cita } from '../../api/types'
import { AgendaEventHoverPortal } from './CitaAgendaEventHover'

const SLOT_MIN = 30

function eventEnd(c: Cita): Date {
  if (c.fecha_fin) {
    const e = new Date(c.fecha_fin)
    if (!Number.isNaN(e.getTime())) return e
  }
  if (c.fecha) {
    const s = new Date(c.fecha)
    if (!Number.isNaN(s.getTime())) return new Date(s.getTime() + SLOT_MIN * 60 * 1000)
  }
  return new Date()
}

function eventStart(c: Cita): Date {
  if (c.fecha) {
    const s = new Date(c.fecha)
    if (!Number.isNaN(s.getTime())) return s
  }
  return new Date()
}

function buildEvents(citas: Cita[]): EventInput[] {
  return citas
    .filter((c) => c.fecha)
    .map((c) => {
      const owner = c.cliente_nombre?.trim() || 'Propietario'
      const pet = c.mascota_nombre?.trim() || (c.mascota_id != null ? `#${c.mascota_id}` : '')
      const tipo = c.motivo?.trim() || 'Cita'
      const title = pet ? `${owner} (${pet}) — ${tipo}` : `${owner} — ${tipo}`
      return {
        id: String(c.id),
        title,
        start: eventStart(c),
        end: eventEnd(c),
        extendedProps: { cita: c },
        backgroundColor: c.urgente ? '#fecaca' : c.estado === 'cancelada' ? '#e5e7eb' : '#ede9fe',
        borderColor: c.urgente ? '#dc2626' : '#7c3aed',
        textColor: '#1e293b',
      }
    })
}

export type AgendaFcView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'

type Props = {
  view: AgendaFcView
  citas: Cita[]
  initialDate: string
  height?: string | number
  editable: boolean
  onEventDrop: (citaId: number, nuevaInicio: Date, nuevaFin: Date) => Promise<void>
  onDatesSet?: (arg: DatesSetArg) => void
  calendarKey?: string
  onEventClick?: (citaId: number) => void
  /** Desde el tooltip: abre el modal de opciones (misma UX que clic en el evento). */
  onAbrirOpcionesCita?: (c: Cita) => void
}

export function CitasAgendaFullCalendar({
  view,
  citas,
  initialDate,
  height = '72vh',
  editable,
  onEventDrop,
  onDatesSet,
  calendarKey,
  onEventClick,
  onAbrirOpcionesCita,
}: Props) {
  const events = useMemo(() => buildEvents(citas), [citas])

  const [hover, setHover] = useState<{ cita: Cita; rect: DOMRect } | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }, [])

  const scheduleHideHover = useCallback(() => {
    clearLeaveTimer()
    leaveTimer.current = setTimeout(() => setHover(null), 180)
  }, [clearLeaveTimer])

  const closeHover = useCallback(() => {
    clearLeaveTimer()
    setHover(null)
  }, [clearLeaveTimer])

  function openHover(arg: EventHoveringArg) {
    const raw = arg.event.extendedProps?.cita as Cita | undefined
    if (!raw || !arg.el) return
    clearLeaveTimer()
    setHover({ cita: raw, rect: arg.el.getBoundingClientRect() })
  }

  async function handleDrop(info: EventDropArg) {
    const id = parseInt(info.event.id, 10)
    if (!id || !info.event.start) {
      info.revert()
      return
    }
    const start = info.event.start
    const end = info.event.end ?? new Date(start.getTime() + SLOT_MIN * 60 * 1000)
    try {
      closeHover()
      await onEventDrop(id, start, end)
    } catch {
      info.revert()
    }
  }

  return (
    <div className="fc-agenda overflow-hidden rounded-2xl border border-emerald-100/60 bg-white shadow-card ring-1 ring-emerald-50/40">
      <FullCalendar
        key={calendarKey ?? `${view}-${initialDate}`}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={view}
        initialDate={initialDate}
        locale={esLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
        height={height}
        editable={editable}
        eventDurationEditable={editable}
        eventStartEditable={editable}
        snapDuration="00:30:00"
        slotDuration="00:30:00"
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        scrollTime="07:00:00"
        allDaySlot={false}
        weekends
        events={events}
        eventDrop={editable ? handleDrop : undefined}
        eventDragStart={() => closeHover()}
        eventMouseEnter={(info) => openHover(info)}
        eventMouseLeave={() => scheduleHideHover()}
        eventClick={
          onEventClick
            ? (info) => {
                info.jsEvent.preventDefault()
                closeHover()
                const id = parseInt(info.event.id, 10)
                if (id) onEventClick(id)
              }
            : undefined
        }
        datesSet={onDatesSet}
        buttonText={{
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          list: 'Lista',
        }}
        dayHeaderFormat={{ weekday: 'short', day: 'numeric', month: 'numeric' }}
        slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: false }}
        eventTimeFormat={{ hour: 'numeric', minute: '2-digit', hour12: false }}
        listDayFormat={{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }}
        displayEventEnd
      />
      <AgendaEventHoverPortal
        cita={hover?.cita ?? null}
        anchorRect={hover?.rect ?? null}
        open={hover != null}
        onKeepOpen={clearLeaveTimer}
        onRequestClose={closeHover}
        onAbrirOpcionesCita={onAbrirOpcionesCita}
      />
    </div>
  )
}
