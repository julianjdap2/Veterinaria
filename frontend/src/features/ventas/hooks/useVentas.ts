import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { VentasListParams } from '../api'
import { fetchVentas, fetchVentaById, createVenta } from '../api'

export const ventasKeys = {
  all: ['ventas'] as const,
  list: (params: VentasListParams) => [...ventasKeys.all, 'list', params] as const,
  detail: (id: number) => [...ventasKeys.all, 'detail', id] as const,
}

export function useVentas(params: VentasListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ventasKeys.list(params),
    queryFn: () => fetchVentas(params),
    enabled: options?.enabled !== false,
  })
}

export function useVentaDetail(id: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ventasKeys.detail(id ?? 0),
    queryFn: () => fetchVentaById(id!),
    enabled: (options?.enabled !== false) && id != null && id > 0,
  })
}

export function useCreateVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createVenta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ventasKeys.all })
    },
  })
}
