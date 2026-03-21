/**
 * Servicio de citas: agenda, por mascota, crear, actualizar, prescripción (medicamentos a recetar).
 */

import apiClient from '../../api/client'
import type {
  Cita,
  CitaCreate,
  CitaUpdate,
  CitasDisponibilidad,
  CitaRecurrenteCreate,
  CitaLlegadaCreate,
  CitasRecurrentesResponse,
  ListaEsperaCreate,
  ListaEsperaResponse,
} from '../../api/types'
import type { FormulaItem, FormulaItemCreate } from '../../api/types'
import type { PaginatedResponse, PaginationParams } from '../../core/types'

export interface CitasAgendaFilters extends PaginationParams {
  fecha_desde?: string
  fecha_hasta?: string
  estado?: string
  veterinario_id?: number
  en_sala_espera?: boolean
}

export async function fetchCitasAgenda(
  params: CitasAgendaFilters
): Promise<PaginatedResponse<Cita>> {
  const { data } = await apiClient.get<PaginatedResponse<Cita>>('/citas/agenda', {
    params,
  })
  return data
}

export async function fetchCitaById(id: number): Promise<Cita> {
  const { data } = await apiClient.get<Cita>(`/citas/${id}`)
  return data
}

export async function fetchCitasByMascota(mascotaId: number): Promise<Cita[]> {
  const { data } = await apiClient.get<Cita[]>(`/citas/mascota/${mascotaId}`)
  return data
}

export async function createCita(payload: CitaCreate): Promise<Cita> {
  const { data } = await apiClient.post<Cita>('/citas/', payload)
  return data
}

export async function createCitaLlegada(payload: CitaLlegadaCreate): Promise<Cita> {
  const { data } = await apiClient.post<Cita>('/citas/llegada', payload)
  return data
}

export async function updateCita(id: number, payload: CitaUpdate): Promise<Cita> {
  const { data } = await apiClient.patch<Cita>(`/citas/${id}`, payload)
  return data
}

export async function createCitasRecurrentes(
  payload: CitaRecurrenteCreate,
): Promise<CitasRecurrentesResponse> {
  const { data } = await apiClient.post<CitasRecurrentesResponse>('/citas/recurrentes', payload)
  return data
}

export async function createListaEspera(
  payload: ListaEsperaCreate,
): Promise<ListaEsperaResponse> {
  const { data } = await apiClient.post<ListaEsperaResponse>('/citas/waitlist', payload)
  return data
}

export async function fetchListaEspera(
  fecha: string, // 'YYYY-MM-DD'
  veterinarioId?: number | null,
  procesadas: boolean = false,
  soloUrgentes: boolean = false,
): Promise<ListaEsperaResponse[]> {
  const params: Record<string, string | number | boolean> = { fecha, procesadas, solo_urgentes: soloUrgentes }
  if (veterinarioId != null) params.veterinario_id = veterinarioId
  const { data } = await apiClient.get<ListaEsperaResponse[]>('/citas/waitlist', {
    params,
  })
  return data
}

export async function promoteListaEspera(entryId: number): Promise<ListaEsperaResponse> {
  const { data } = await apiClient.post<ListaEsperaResponse>(`/citas/waitlist/${entryId}/promover`)
  return data
}

export async function discardListaEspera(entryId: number): Promise<ListaEsperaResponse> {
  const { data } = await apiClient.post<ListaEsperaResponse>(`/citas/waitlist/${entryId}/descartar`)
  return data
}

export async function callListaEspera(entryId: number): Promise<ListaEsperaResponse> {
  const { data } = await apiClient.post<ListaEsperaResponse>(`/citas/waitlist/${entryId}/llamar`)
  return data
}

export async function promoteNextListaEspera(
  fecha: string,
  veterinarioId: number,
): Promise<ListaEsperaResponse> {
  const { data } = await apiClient.post<ListaEsperaResponse>('/citas/waitlist/promover-siguiente', null, {
    params: { fecha, veterinario_id: veterinarioId },
  })
  return data
}

export async function fetchFormulaCita(citaId: number): Promise<FormulaItem[]> {
  const { data } = await apiClient.get<FormulaItem[]>(`/citas/${citaId}/formula`)
  return data
}

export async function fetchCitasDisponibilidad(
  fecha: string, // 'YYYY-MM-DD'
  veterinarioId: number,
): Promise<CitasDisponibilidad> {
  const { data } = await apiClient.get<CitasDisponibilidad>('/citas/disponibilidad', {
    params: { fecha, veterinario_id: veterinarioId },
  })
  return data
}

export async function addFormulaItemCita(
  citaId: number,
  payload: FormulaItemCreate
): Promise<FormulaItem> {
  const { data } = await apiClient.post<FormulaItem>(`/citas/${citaId}/formula`, payload)
  return data
}

export async function deleteFormulaItemCita(citaId: number, itemId: number): Promise<void> {
  await apiClient.delete(`/citas/${citaId}/formula/${itemId}`)
}
