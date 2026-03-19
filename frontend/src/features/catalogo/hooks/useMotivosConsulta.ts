import { useQuery } from '@tanstack/react-query'
import { fetchMotivosConsulta } from '../api'

export function useMotivosConsulta() {
  return useQuery({
    queryKey: ['catalogo', 'motivos-consulta'],
    queryFn: fetchMotivosConsulta,
  })
}
