import { useQuery } from '@tanstack/react-query'
import { fetchConsultasByMascota } from '../api'

export function useConsultasByMascota(mascotaId: number | null) {
  return useQuery({
    queryKey: ['consultas', 'mascota', mascotaId],
    queryFn: () => fetchConsultasByMascota(mascotaId!),
    enabled: mascotaId != null && mascotaId > 0,
  })
}
