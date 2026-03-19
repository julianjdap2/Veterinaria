import { useQuery } from '@tanstack/react-query'
import { fetchRazas } from '../api'

export function useRazas(especieId: number | null) {
  return useQuery({
    queryKey: ['catalogo', 'razas', especieId],
    queryFn: () => fetchRazas(especieId),
    enabled: especieId != null,
  })
}

/** Todas las razas (sin filtrar por especie). Útil para listados. */
export function useAllRazas() {
  return useQuery({
    queryKey: ['catalogo', 'razas', 'all'],
    queryFn: () => fetchRazas(null),
  })
}
