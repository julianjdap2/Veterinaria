import { useQuery } from '@tanstack/react-query'
import { fetchClientes, type ClientesFilters } from '../api'

const keys = {
  list: (f: ClientesFilters) => ['clientes', f] as const,
  detail: (id: number) => ['clientes', id] as const,
}

export function useClientes(
  filters: ClientesFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: () => fetchClientes(filters),
    enabled: options?.enabled ?? true,
  })
}

export function clientesKeys() {
  return keys
}
