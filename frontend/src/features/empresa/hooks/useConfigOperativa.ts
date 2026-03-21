import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchConfigOperativa, patchConfigOperativa } from '../api'
import type { ConfigOperativaUpdate } from '../../../api/types'

export const configOperativaKey = ['empresa', 'config-operativa'] as const

export function useConfigOperativa(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: configOperativaKey,
    queryFn: fetchConfigOperativa,
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  })
}

export function usePatchConfigOperativa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ConfigOperativaUpdate) => patchConfigOperativa(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configOperativaKey })
    },
  })
}
