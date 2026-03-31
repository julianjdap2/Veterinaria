import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchUsuarios,
  createUsuario,
  fetchVeterinarios,
  fetchMisPermisosAdmin,
  fetchMiOperativo,
  fetchUsuarioDetalle,
  patchUsuario,
  type UsuarioPatchPayload,
} from '../api'
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

export function useMiOperativo(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['usuarios', 'mi-operativo'] as const,
    queryFn: () => fetchMiOperativo(),
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

export function usuarioDetalleKey(id: number) {
  return ['usuarios', 'detalle', id] as const
}

export function useUsuarioDetalle(id: number | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: id != null ? usuarioDetalleKey(id) : ['usuarios', 'detalle', 'none'],
    queryFn: () => fetchUsuarioDetalle(id!),
    enabled: (options?.enabled ?? true) && id != null,
  })
}

export function usePatchUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UsuarioPatchPayload }) => patchUsuario(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: usuarioDetalleKey(id) })
    },
  })
}

/** Lista veterinarios (para asignar a citas). Solo ADMIN y RECEPCIÓN pueden llamar al endpoint. */
export function useVeterinarios(options?: { enabled?: boolean; soloAgendaPersonal?: boolean }) {
  const solo = options?.soloAgendaPersonal !== false
  return useQuery({
    queryKey: ['usuarios', 'veterinarios', solo] as const,
    queryFn: () => fetchVeterinarios({ solo_agenda_personal: solo }),
    enabled: options?.enabled ?? true,
    staleTime: STALE_PERMISOS_MS,
  })
}
