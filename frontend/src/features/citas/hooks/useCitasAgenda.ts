import { useQuery } from '@tanstack/react-query'
import {
  fetchCitasAgenda,
  fetchCitaById,
  fetchCitasByMascota,
} from '../api'
import type { CitasAgendaFilters } from '../api'

const keys = {
  agenda: (f: CitasAgendaFilters) => ['citas', 'agenda', f] as const,
  detail: (id: number) => ['citas', id] as const,
  byMascota: (mascotaId: number) => ['citas', 'mascota', mascotaId] as const,
}

export function useCitasAgenda(filters: CitasAgendaFilters) {
  return useQuery({
    queryKey: keys.agenda(filters),
    queryFn: () => fetchCitasAgenda(filters),
  })
}

export function useCitaDetail(id: number | null) {
  return useQuery({
    queryKey: keys.detail(id ?? 0),
    queryFn: () => fetchCitaById(id!),
    enabled: id != null && id > 0,
  })
}

export function useCitasByMascota(mascotaId: number | null) {
  return useQuery({
    queryKey: keys.byMascota(mascotaId ?? 0),
    queryFn: () => fetchCitasByMascota(mascotaId!),
    enabled: mascotaId != null && mascotaId > 0,
  })
}

export function citasKeys() {
  return keys
}
