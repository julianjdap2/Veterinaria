import apiClient from '../../api/client'
import type { PaginatedResponse } from '../../core/types'

export interface SuperadminEmpresa {
  id: number
  nombre: string
  email?: string | null
  activa: boolean
  estado: string
  created_at: string
}

export interface EmpresaAdminPermisos {
  empresa_id: number
  admin_gestion_usuarios: boolean
  admin_gestion_inventario: boolean
  admin_gestion_ventas: boolean
  admin_gestion_citas: boolean
  admin_ver_auditoria: boolean
  admin_configuracion_empresa: boolean
  admin_carga_masiva_inventario: boolean
  admin_exportacion_dashboard: boolean
}

/** Perfil admin: null en permisos = heredar de la plantilla de empresa. */
export interface EmpresaPerfilAdmin {
  id: number
  empresa_id: number
  nombre: string
  slug: string
  admin_gestion_usuarios: boolean | null
  admin_gestion_inventario: boolean | null
  admin_gestion_ventas: boolean | null
  admin_gestion_citas: boolean | null
  admin_ver_auditoria: boolean | null
  admin_configuracion_empresa: boolean | null
  admin_carga_masiva_inventario: boolean | null
  admin_exportacion_dashboard: boolean | null
}

export interface EmpresaPerfilAdminCreatePayload {
  nombre: string
  slug: string
  overrides?: Partial<
    Omit<EmpresaAdminPermisos, 'empresa_id'>
  >
}

export async function fetchSuperadminEmpresas(
  page: number = 1,
  page_size: number = 20,
): Promise<PaginatedResponse<SuperadminEmpresa>> {
  const { data } = await apiClient.get<PaginatedResponse<SuperadminEmpresa>>('/superadmin/empresas', {
    params: { page, page_size },
  })
  return data
}

export async function updateSuperadminEmpresa(
  empresaId: number,
  payload: Partial<Pick<SuperadminEmpresa, 'nombre' | 'email' | 'activa' | 'estado'>>,
): Promise<SuperadminEmpresa> {
  const { data } = await apiClient.patch<SuperadminEmpresa>(`/superadmin/empresas/${empresaId}`, payload)
  return data
}

export async function fetchEmpresaAdminPermisos(empresaId: number): Promise<EmpresaAdminPermisos> {
  const { data } = await apiClient.get<EmpresaAdminPermisos>(`/superadmin/empresas/${empresaId}/permisos-admin`)
  return data
}

export async function updateEmpresaAdminPermisos(
  empresaId: number,
  payload: Omit<EmpresaAdminPermisos, 'empresa_id'>,
): Promise<EmpresaAdminPermisos> {
  const { data } = await apiClient.patch<EmpresaAdminPermisos>(
    `/superadmin/empresas/${empresaId}/permisos-admin`,
    payload,
  )
  return data
}

export interface EmpresaConfiguracion {
  empresa_id: number
  modulo_inventario: boolean
  modulo_ventas: boolean
  modulo_reportes: boolean
  modulo_facturacion_electronica: boolean
  feature_recordatorios_automaticos: boolean
  feature_dashboard_avanzado: boolean
  feature_exportaciones: boolean
}

export async function fetchEmpresaConfig(empresaId: number): Promise<EmpresaConfiguracion> {
  const { data } = await apiClient.get<EmpresaConfiguracion>(`/superadmin/empresas/${empresaId}/config`)
  return data
}

export async function updateEmpresaConfig(
  empresaId: number,
  payload: Omit<EmpresaConfiguracion, 'empresa_id'>,
): Promise<EmpresaConfiguracion> {
  const { data } = await apiClient.patch<EmpresaConfiguracion>(`/superadmin/empresas/${empresaId}/config`, payload)
  return data
}

export async function fetchEmpresaPerfilesAdmin(empresaId: number): Promise<EmpresaPerfilAdmin[]> {
  const { data } = await apiClient.get<EmpresaPerfilAdmin[]>(
    `/superadmin/empresas/${empresaId}/perfiles-admin`,
  )
  return data
}

export async function createEmpresaPerfilAdmin(
  empresaId: number,
  payload: EmpresaPerfilAdminCreatePayload,
): Promise<EmpresaPerfilAdmin> {
  const { data } = await apiClient.post<EmpresaPerfilAdmin>(
    `/superadmin/empresas/${empresaId}/perfiles-admin`,
    payload,
  )
  return data
}

export async function deleteEmpresaPerfilAdmin(empresaId: number, perfilId: number): Promise<void> {
  await apiClient.delete(`/superadmin/empresas/${empresaId}/perfiles-admin/${perfilId}`)
}

export async function patchEmpresaPerfilAdmin(
  empresaId: number,
  perfilId: number,
  payload: {
    nombre?: string
    slug?: string
    /** null = heredar de la plantilla */
    overrides?: Record<string, boolean | null>
  },
): Promise<EmpresaPerfilAdmin> {
  const { data } = await apiClient.patch<EmpresaPerfilAdmin>(
    `/superadmin/empresas/${empresaId}/perfiles-admin/${perfilId}`,
    payload,
  )
  return data
}

/** Plan de suscripción (respuesta /superadmin/planes). */
export interface SuperadminPlan {
  id: number
  nombre: string
  codigo: string
  precio: number
  max_usuarios: number | null
  max_mascotas: number | null
  max_citas_mes: number | null
  modulo_inventario: boolean
  modulo_ventas: boolean
  modulo_reportes: boolean
  modulo_facturacion_electronica: boolean
  feature_recordatorios_automaticos: boolean
  feature_dashboard_avanzado: boolean
  feature_exportaciones: boolean
  soporte_nivel: string
}

export type SuperadminPlanCreate = Omit<SuperadminPlan, 'id'>
export type SuperadminPlanUpdate = Partial<Omit<SuperadminPlan, 'id'>>

export async function fetchSuperadminPlanes(): Promise<SuperadminPlan[]> {
  const { data } = await apiClient.get<SuperadminPlan[]>('/superadmin/planes')
  return data
}

export async function createSuperadminPlan(payload: SuperadminPlanCreate): Promise<SuperadminPlan> {
  const { data } = await apiClient.post<SuperadminPlan>('/superadmin/planes', payload)
  return data
}

export async function updateSuperadminPlan(
  planId: number,
  payload: SuperadminPlanUpdate,
): Promise<SuperadminPlan> {
  const { data } = await apiClient.patch<SuperadminPlan>(`/superadmin/planes/${planId}`, payload)
  return data
}
