import apiClient from '../../api/client'
import type { SuscripcionTenantResponse } from '../../api/types'

export async function fetchMiSuscripcion(): Promise<SuscripcionTenantResponse> {
  const { data } = await apiClient.get<SuscripcionTenantResponse>('/empresa/suscripcion')
  return data
}
