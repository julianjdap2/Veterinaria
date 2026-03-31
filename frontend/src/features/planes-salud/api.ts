import apiClient from '../../api/client'
import { ApiError } from '../../api/errors'
import type {
  AfiliacionMascotaActiva,
  EstadoCuentaPlan,
  PlanAfiliacion,
  PlanSalud,
  PlanSaludMeta,
} from '../../api/types'

export async function fetchPlanSaludMeta(): Promise<PlanSaludMeta> {
  const { data } = await apiClient.get<PlanSaludMeta>('/planes-salud/meta')
  return data
}

export async function patchModuloPlanesSalud(habilitado: boolean): Promise<PlanSaludMeta> {
  const { data } = await apiClient.patch<PlanSaludMeta>('/planes-salud/modulo', { habilitado })
  return data
}

export async function fetchPlanesSalud(): Promise<PlanSalud[]> {
  const { data } = await apiClient.get<PlanSalud[]>('/planes-salud/')
  return data
}

export async function fetchPlanSaludById(id: number): Promise<PlanSalud> {
  const { data } = await apiClient.get<PlanSalud>(`/planes-salud/${id}`)
  return data
}

export async function createPlanSalud(payload: {
  nombre: string
  precio: number
  periodicidad_meses: number
  especies_ids: number[]
  coberturas: {
    categoria_codigo: string
    nombre_servicio: string
    cantidad: number
    cobertura_maxima: number | null
  }[]
}): Promise<PlanSalud> {
  const { data } = await apiClient.post<PlanSalud>('/planes-salud/', payload)
  return data
}

export async function updatePlanSalud(
  id: number,
  payload: Partial<{
    nombre: string
    precio: number
    periodicidad_meses: number
    especies_ids: number[]
    coberturas: {
      categoria_codigo: string
      nombre_servicio: string
      cantidad: number
      cobertura_maxima: number | null
    }[]
    activo: boolean
  }>,
): Promise<PlanSalud> {
  const { data } = await apiClient.patch<PlanSalud>(`/planes-salud/${id}`, payload)
  return data
}

export async function deletePlanSalud(id: number): Promise<void> {
  await apiClient.delete(`/planes-salud/${id}`)
}

export async function fetchAfiliaciones(planId: number): Promise<PlanAfiliacion[]> {
  const { data } = await apiClient.get<PlanAfiliacion[]>(`/planes-salud/${planId}/afiliaciones`)
  return data
}

export async function createAfiliacion(
  planId: number,
  payload: {
    cliente_id: number
    mascota_id: number | null
    fecha_inicio: string
    fecha_fin?: string | null
    valor_pagado?: number | null
    observaciones?: string | null
  },
): Promise<PlanAfiliacion> {
  const { data } = await apiClient.post<PlanAfiliacion>(`/planes-salud/${planId}/afiliaciones`, payload)
  return data
}

export async function deleteAfiliacion(afiliacionId: number): Promise<void> {
  await apiClient.delete(`/planes-salud/afiliaciones/${afiliacionId}`)
}

export async function updateAfiliacion(
  afiliacionId: number,
  payload: Partial<{
    mascota_id: number | null
    fecha_inicio: string
    fecha_fin: string
    valor_pagado: number | null
    observaciones: string | null
  }>,
): Promise<PlanAfiliacion> {
  const { data } = await apiClient.patch<PlanAfiliacion>(
    `/planes-salud/afiliaciones/${afiliacionId}`,
    payload,
  )
  return data
}

export async function fetchEstadoCuenta(afiliacionId: number): Promise<EstadoCuentaPlan> {
  const { data } = await apiClient.get<EstadoCuentaPlan>(
    `/planes-salud/afiliaciones/${afiliacionId}/estado-cuenta`,
  )
  return data
}

export async function fetchAfiliacionActivaMascota(mascotaId: number): Promise<AfiliacionMascotaActiva> {
  try {
    const { data } = await apiClient.get<AfiliacionMascotaActiva>(
      `/planes-salud/mascota/${mascotaId}/afiliacion-activa`,
    )
    return data
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 404) {
      return { tiene_afiliacion: false }
    }
    throw e
  }
}
