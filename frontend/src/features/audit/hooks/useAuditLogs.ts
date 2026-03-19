import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '../api'
import type { AuditFilters } from '../api'

export function auditKeys(filters: AuditFilters) {
  return ['audit', filters] as const
}

export function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: auditKeys(filters),
    queryFn: () => fetchAuditLogs(filters),
  })
}
