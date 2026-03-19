import { useQuery } from '@tanstack/react-query'
import { fetchEspecies } from '../api'

export function useEspecies() {
  return useQuery({
    queryKey: ['catalogo', 'especies'],
    queryFn: fetchEspecies,
  })
}
