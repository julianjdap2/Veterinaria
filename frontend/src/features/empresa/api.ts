import apiClient from '../../api/client'
import type {
  ConfigOperativa,
  ConfigOperativaUpdate,
  TopVariableUsoItem,
  VariablesClinicas,
  VariablesClinicasPatch,
} from '../../api/types'

export async function fetchConfigOperativa(): Promise<ConfigOperativa> {
  const { data } = await apiClient.get<ConfigOperativa>('/empresa/config-operativa')
  return data
}

export async function patchConfigOperativa(payload: ConfigOperativaUpdate): Promise<ConfigOperativa> {
  const { data } = await apiClient.patch<ConfigOperativa>('/empresa/config-operativa', payload)
  return data
}

export async function fetchVariablesClinicas(): Promise<VariablesClinicas> {
  const { data } = await apiClient.get<VariablesClinicas>('/empresa/variables-clinicas')
  return data
}

export async function patchVariablesClinicas(payload: VariablesClinicasPatch): Promise<VariablesClinicas> {
  const { data } = await apiClient.patch<VariablesClinicas>('/empresa/variables-clinicas', payload)
  return data
}

export async function fetchTopPruebasLaboratorioMasUsadas(
  dias: number = 90,
  limit: number = 10,
): Promise<TopVariableUsoItem[]> {
  const { data } = await apiClient.get<TopVariableUsoItem[]>(
    '/empresa/variables-clinicas/pruebas-laboratorio/mas-usadas',
    { params: { dias, limit } },
  )
  return data
}
