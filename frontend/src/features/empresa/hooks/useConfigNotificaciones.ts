import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchConfigNotificaciones, patchConfigNotificaciones } from '../notificacionesApi'
import type { NotificacionesConfigUpdate } from '../../../api/types'

export const configNotificacionesKey = ['empresa', 'config-notificaciones'] as const

export function useConfigNotificaciones(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: configNotificacionesKey,
    queryFn: fetchConfigNotificaciones,
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  })
}

export function usePatchConfigNotificaciones() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: NotificacionesConfigUpdate) => patchConfigNotificaciones(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configNotificacionesKey })
    },
  })
}
