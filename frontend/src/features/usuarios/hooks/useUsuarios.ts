import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsuarios, createUsuario, fetchVeterinarios, fetchMisPermisosAdmin } from '../api'
import type { UsuariosFilters } from '../api'
import type { UsuarioCreate } from '../../../api/types'

export function usuariosKeys(filters?: UsuariosFilters) {
  const base = ['usuarios'] as const
  if (!filters) return base
  return [...base, filters] as const
}

export function useUsuarios(filters: UsuariosFilters) {
  return useQuery({
    queryKey: usuariosKeys(filters),
    queryFn: () => fetchUsuarios(filters),
  })
}

const STALE_PERMISOS_MS = 5 * 60 * 1000

export function useMisPermisosAdmin(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['usuarios', 'mi-permisos-admin'] as const,
    queryFn: () => fetchMisPermisosAdmin(),
    enabled: options?.enabled ?? true,
    staleTime: STALE_PERMISOS_MS,
  })
}

export function useCreateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UsuarioCreate) => createUsuario(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}

/** Lista veterinarios (para asignar a citas). Solo ADMIN y RECEPCIÓN pueden llamar al endpoint. */
export function useVeterinarios(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['usuarios', 'veterinarios'],
    queryFn: () => fetchVeterinarios(),
    enabled: options?.enabled ?? true,
    staleTime: STALE_PERMISOS_MS,
  })
}
