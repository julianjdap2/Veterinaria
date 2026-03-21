import apiClient from '../../api/client'
import type { NotificacionesConfig, NotificacionesConfigUpdate } from '../../api/types'

export async function fetchConfigNotificaciones(): Promise<NotificacionesConfig> {
  const { data } = await apiClient.get<NotificacionesConfig>('/empresa/config-notificaciones')
  return data
}

export async function patchConfigNotificaciones(
  payload: NotificacionesConfigUpdate,
): Promise<NotificacionesConfig> {
  const { data } = await apiClient.patch<NotificacionesConfig>(
    '/empresa/config-notificaciones',
    payload,
  )
  return data
}
