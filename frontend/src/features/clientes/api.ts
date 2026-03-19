/**
 * Servicio de clientes: desacoplado de React.
 */

import apiClient from '../../api/client'
import type { Cliente, ClienteCreate, ClienteUpdate } from '../../api/types'
import type { PaginatedResponse, PaginationParams } from '../../core/types'

export interface ClientesFilters extends PaginationParams {
  nombre?: string
  documento?: string
  incluir_inactivos?: boolean
}

export async function fetchClientes(
  params: ClientesFilters
): Promise<PaginatedResponse<Cliente>> {
  const { data } = await apiClient.get<PaginatedResponse<Cliente>>('/clientes/', {
    params,
  })
  return data
}

export async function fetchClienteById(id: number): Promise<Cliente> {
  const { data } = await apiClient.get<Cliente>(`/clientes/${id}`)
  return data
}

export async function createCliente(payload: ClienteCreate): Promise<Cliente> {
  const { data } = await apiClient.post<Cliente>('/clientes/', payload)
  return data
}

export async function updateClienteActivo(id: number, activo: boolean): Promise<Cliente> {
  const { data } = await apiClient.patch<Cliente>(`/clientes/${id}`, { activo })
  return data
}

export async function updateCliente(id: number, payload: ClienteUpdate): Promise<Cliente> {
  const { data } = await apiClient.patch<Cliente>(`/clientes/${id}`, payload)
  return data
}

export async function deleteCliente(id: number): Promise<void> {
  await apiClient.delete(`/clientes/${id}`)
}
