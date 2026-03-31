/**
 * Servicio de mascotas: desacoplado de React.
 */

import apiClient from '../../api/client'
import type { Mascota, MascotaCreate, MascotaUpdate } from '../../api/types'
import type { PaginatedResponse, PaginationParams } from '../../core/types'

export interface MascotasFilters extends PaginationParams {
  cliente_id?: number
  nombre?: string
  /** Nombre mascota, nombre cliente o documento (OR) */
  busqueda?: string
  incluir_inactivos?: boolean
}

export async function fetchMascotas(
  params: MascotasFilters
): Promise<PaginatedResponse<Mascota>> {
  const { data } = await apiClient.get<PaginatedResponse<Mascota>>('/mascotas/', {
    params,
  })
  return data
}

export async function fetchMascotaById(id: number): Promise<Mascota> {
  const { data } = await apiClient.get<Mascota>(`/mascotas/${id}`)
  return data
}

export async function createMascota(payload: MascotaCreate): Promise<Mascota> {
  const { data } = await apiClient.post<Mascota>('/mascotas/', payload)
  return data
}

export async function updateMascotaActivo(id: number, activo: boolean): Promise<Mascota> {
  const { data } = await apiClient.patch<Mascota>(`/mascotas/${id}`, { activo })
  return data
}

export async function updateMascota(id: number, payload: MascotaUpdate): Promise<Mascota> {
  const { data } = await apiClient.patch<Mascota>(`/mascotas/${id}`, payload)
  return data
}

export async function deleteMascota(id: number): Promise<void> {
  await apiClient.delete(`/mascotas/${id}`)
}
