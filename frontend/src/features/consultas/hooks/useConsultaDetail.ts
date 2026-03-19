import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchConsultaById, fetchResumenConsulta, fetchFormula } from '../api'

export function useConsultaDetail(consultaId: number | null) {
  return useQuery({
    queryKey: ['consultas', 'detail', consultaId],
    queryFn: () => fetchConsultaById(consultaId!),
    enabled: consultaId != null && consultaId > 0,
  })
}

export function useResumenConsulta(consultaId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['consultas', 'resumen', consultaId],
    queryFn: () => fetchResumenConsulta(consultaId!),
    enabled: enabled && consultaId != null && consultaId > 0,
  })
}

export function useFormula(consultaId: number | null) {
  return useQuery({
    queryKey: ['consultas', 'formula', consultaId],
    queryFn: () => fetchFormula(consultaId!),
    enabled: consultaId != null && consultaId > 0,
  })
}

export function useFormulaInvalidate() {
  const queryClient = useQueryClient()
  return (consultaId: number) =>
    queryClient.invalidateQueries({ queryKey: ['consultas', 'formula', consultaId] })
}
