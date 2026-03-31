import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTopPruebasLaboratorioMasUsadas, fetchVariablesClinicas, patchVariablesClinicas } from '../api'
import type { VariablesClinicasPatch } from '../../../api/types'

export const variablesClinicasKey = ['empresa', 'variables-clinicas'] as const

export function useVariablesClinicas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: variablesClinicasKey,
    queryFn: fetchVariablesClinicas,
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  })
}

export function usePatchVariablesClinicas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: VariablesClinicasPatch) => patchVariablesClinicas(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: variablesClinicasKey })
    },
  })
}

export function useTopPruebasLaboratorioMasUsadas(options?: {
  dias?: number
  limit?: number
  enabled?: boolean
}) {
  const dias = options?.dias ?? 90
  const limit = options?.limit ?? 10
  return useQuery({
    queryKey: ['empresa', 'variables-clinicas', 'pruebas-lab-mas-usadas', dias, limit] as const,
    queryFn: () => fetchTopPruebasLaboratorioMasUsadas(dias, limit),
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  })
}
