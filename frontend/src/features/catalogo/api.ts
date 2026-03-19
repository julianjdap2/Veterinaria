/**
 * Catálogo: especies, razas y motivos de consulta (solo lectura).
 */

import apiClient from '../../api/client'
import type { Especie, Raza } from '../../api/types'

export interface MotivoConsultaItem {
  id: string
  nombre: string
}

export async function fetchEspecies(): Promise<Especie[]> {
  const { data } = await apiClient.get<Especie[]>('/catalogo/especies')
  return data
}

export async function fetchRazas(especieId: number | null): Promise<Raza[]> {
  const params = especieId != null ? { especie_id: especieId } : {}
  const { data } = await apiClient.get<Raza[]>('/catalogo/razas', { params })
  return data
}

export async function fetchMotivosConsulta(): Promise<MotivoConsultaItem[]> {
  const { data } = await apiClient.get<MotivoConsultaItem[]>('/catalogo/motivos-consulta')
  return data
}
