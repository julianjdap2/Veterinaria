import apiClient from '../../api/client'
import type { ConfigOperativa, ConfigOperativaUpdate } from '../../api/types'

export async function fetchConfigOperativa(): Promise<ConfigOperativa> {
  const { data } = await apiClient.get<ConfigOperativa>('/empresa/config-operativa')
  return data
}

export async function patchConfigOperativa(payload: ConfigOperativaUpdate): Promise<ConfigOperativa> {
  const { data } = await apiClient.patch<ConfigOperativa>('/empresa/config-operativa', payload)
  return data
}
