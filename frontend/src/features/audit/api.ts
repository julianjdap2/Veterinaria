/**
 * API de auditoría (solo ADMIN).
 */

import apiClient from '../../api/client'
import type { AuditLog } from '../../api/types'
import type { PaginatedResponse, PaginationParams } from '../../core/types'

export interface AuditFilters extends PaginationParams {
  tabla?: string
  usuario_id?: number
  fecha_desde?: string
  fecha_hasta?: string
}

export async function fetchAuditLogs(
  params: AuditFilters
): Promise<PaginatedResponse<AuditLog>> {
  const { data } = await apiClient.get<PaginatedResponse<AuditLog>>('/audit/', {
    params,
  })
  return data
}
