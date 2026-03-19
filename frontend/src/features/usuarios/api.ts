/**
 * API de usuarios (solo ADMIN).
 */

import apiClient from '../../api/client'
import type { Usuario, UsuarioCreate } from '../../api/types'
import type { PaginatedResponse, PaginationParams } from '../../core/types'

export interface UsuariosFilters extends PaginationParams {}

export async function fetchUsuarios(
  params: UsuariosFilters
): Promise<PaginatedResponse<Usuario>> {
  const { data } = await apiClient.get<PaginatedResponse<Usuario>>('/usuarios/', {
    params,
  })
  return data
}

export async function createUsuario(payload: UsuarioCreate): Promise<Usuario> {
  const { data } = await apiClient.post<Usuario>('/usuarios/', payload)
  return data
}

export async function updateUsuarioActivo(id: number, activo: boolean): Promise<Usuario> {
  const { data } = await apiClient.patch<Usuario>(`/usuarios/${id}`, { activo })
  return data
}

/** Lista veterinarios (ADMIN y RECEPCIÓN, para asignar a citas). */
export async function fetchVeterinarios(): Promise<Usuario[]> {
  const { data } = await apiClient.get<Usuario[]>('/usuarios/veterinarios')
  return data
}
