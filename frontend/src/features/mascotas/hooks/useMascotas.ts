import { useQuery } from '@tanstack/react-query'
import { fetchMascotas, type MascotasFilters } from '../api'

const keys = {
  list: (f: MascotasFilters) => ['mascotas', f] as const,
  detail: (id: number) => ['mascotas', id] as const,
}

export function useMascotas(
  filters: MascotasFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: () => fetchMascotas(filters),
    enabled: options?.enabled ?? true,
  })
}

export function mascotasKeys() {
  return keys
}
