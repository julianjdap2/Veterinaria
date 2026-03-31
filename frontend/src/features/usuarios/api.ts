/**
 * API de usuarios (solo ADMIN).
 */

import apiClient from '../../api/client'
import type {
  Usuario,
  UsuarioCreate,
  UsuarioDetalle,
  UsuarioOperativo,
  UsuarioPreferencias,
  UsuarioProfesional,
} from '../../api/types'
import type { PaginatedResponse, PaginationParams } from '../../core/types'

export interface UsuariosFilters extends PaginationParams {}

/** Permisos granulares del admin actual (GET /usuarios/mi-permisos-admin). */
export interface MisPermisosAdmin {
  admin_gestion_usuarios: boolean
  admin_gestion_inventario: boolean
  admin_gestion_ventas: boolean
  admin_gestion_citas: boolean
  admin_ver_auditoria: boolean
  admin_configuracion_empresa: boolean
  admin_carga_masiva_inventario: boolean
  admin_exportacion_dashboard: boolean
}

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

export async function fetchMisPermisosAdmin(): Promise<MisPermisosAdmin> {
  const { data } = await apiClient.get<MisPermisosAdmin>('/usuarios/mi-permisos-admin')
  return data
}

/** Privilegios operativos del usuario autenticado (cualquier rol de empresa). */
export async function fetchMiOperativo(): Promise<UsuarioOperativo> {
  const { data } = await apiClient.get<UsuarioOperativo>('/usuarios/mi-operativo')
  return data
}

export async function fetchUsuarios(
  params: UsuariosFilters
): Promise<PaginatedResponse<Usuario>> {
  const { data } = await apiClient.get<PaginatedResponse<Usuario>>('/usuarios/', {
    params,
  })
  return data
}

export async function createUsuario(payload: UsuarioCreate): Promise<Usuario> {
  const { data } = await apiClient.post<Usuario>('/usuarios/', payload)
  return data
}

export async function updateUsuarioActivo(id: number, activo: boolean): Promise<Usuario> {
  const { data } = await apiClient.patch<Usuario>(`/usuarios/${id}`, { activo })
  return data
}

/** Cuerpo parcial de PATCH /usuarios/:id (coincide con UsuarioUpdate en backend). */
export type UsuarioPatchPayload = {
  nombre?: string
  email?: string
  documento?: string | null
  telefono?: string | null
  rol_id?: number
  activo?: boolean
  perfil_admin_id?: number | null
  extendido?: {
    preferencias?: Partial<UsuarioPreferencias>
    operativo?: Partial<UsuarioOperativo>
    profesional?: Partial<UsuarioProfesional>
  }
}

export async function fetchUsuarioDetalle(id: number): Promise<UsuarioDetalle> {
  const { data } = await apiClient.get<UsuarioDetalle>(`/usuarios/${id}`)
  return data
}

export async function patchUsuario(id: number, payload: UsuarioPatchPayload): Promise<Usuario> {
  const { data } = await apiClient.patch<Usuario>(`/usuarios/${id}`, payload)
  return data
}

/** Catálogo de perfiles (configurados por superadmin) para asignar a admins. */
export async function fetchPerfilesAdminEmpresa(): Promise<EmpresaPerfilAdmin[]> {
  const { data } = await apiClient.get<EmpresaPerfilAdmin[]>('/usuarios/perfiles-admin')
  return data
}

/** Solo ADMIN: nueva contraseña sin conocer la anterior. */
export async function resetUsuarioPassword(id: number, password: string): Promise<Usuario> {
  const { data } = await apiClient.patch<Usuario>(`/usuarios/${id}/password`, { password })
  return data
}

/** Lista veterinarios (ADMIN y RECEPCIÓN, para asignar a citas). */
export async function fetchVeterinarios(params?: { solo_agenda_personal?: boolean }): Promise<Usuario[]> {
  const { data } = await apiClient.get<Usuario[]>('/usuarios/veterinarios', {
    params:
      params?.solo_agenda_personal === true ? { solo_agenda_personal: true } : undefined,
  })
  return data
}
