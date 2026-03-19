/**
 * Servicio de citas: agenda, por mascota, crear, actualizar, prescripción (medicamentos a recetar).
 */

import apiClient from '../../api/client'
import type { Cita, CitaCreate, CitaUpdate } from '../../api/types'
import type { FormulaItem, FormulaItemCreate } from '../../api/types'
import type { PaginatedResponse, PaginationParams } from '../../core/types'

export interface CitasAgendaFilters extends PaginationParams {
  fecha_desde?: string
  fecha_hasta?: string
  estado?: string
  veterinario_id?: number
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

export async function updateCita(id: number, payload: CitaUpdate): Promise<Cita> {
  const { data } = await apiClient.patch<Cita>(`/citas/${id}`, payload)
  return data
}

export async function fetchFormulaCita(citaId: number): Promise<FormulaItem[]> {
  const { data } = await apiClient.get<FormulaItem[]>(`/citas/${citaId}/formula`)
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
