import apiClient from '../../api/client'
import type { DashboardNotificationLog, DashboardResumen } from '../../api/types'
import type { PaginatedResponse } from '../../core/types'

export async function fetchDashboardResumen(dias: number = 1): Promise<DashboardResumen> {
  const { data } = await apiClient.get<DashboardResumen>('/dashboard/resumen', {
    params: { dias },
  })
  return data
}

export async function fetchDashboardNotificaciones(params: {
  dias?: number
  page?: number
  page_size?: number
  canal?: string
  estado?: string
}): Promise<PaginatedResponse<DashboardNotificationLog>> {
  const { data } = await apiClient.get<PaginatedResponse<DashboardNotificationLog>>('/dashboard/notificaciones', {
    params,
  })
  return data
}
