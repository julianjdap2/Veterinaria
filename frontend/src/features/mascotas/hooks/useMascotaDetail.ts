import { useQuery } from '@tanstack/react-query'
import { fetchMascotaById } from '../api'

export function useMascotaDetail(id: number | null) {
  return useQuery({
    queryKey: ['mascotas', id],
    queryFn: () => fetchMascotaById(id!),
    enabled: id != null && id > 0,
  })
}
