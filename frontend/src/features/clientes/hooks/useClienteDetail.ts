import { useQuery } from '@tanstack/react-query'
import { fetchClienteById } from '../api'

export function useClienteDetail(id: number | null) {
  return useQuery({
    queryKey: ['clientes', id],
    queryFn: () => fetchClienteById(id!),
    enabled: id != null && id > 0,
  })
}
