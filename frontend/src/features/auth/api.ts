/**
 * Servicio de autenticación: login y decodificado del JWT (payload básico).
 */

import apiClient from '../../api/client'
import type { TokenResponse } from '../../api/types'
import type { UserInfo } from '../../core/auth-store'

function parseJwtPayload(token: string): Partial<UserInfo> {
  try {
    const base64 = token.split('.')[1]
    if (!base64) return {}
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as Record<string, unknown>
    return {
      userId: typeof payload.user_id === 'number' ? payload.user_id : 0,
      empresaId: typeof payload.empresa_id === 'number' ? payload.empresa_id : 0,
      rolId: typeof payload.rol_id === 'number' ? payload.rol_id : 0,
      email: typeof payload.sub === 'string' ? payload.sub : undefined,
    }
  } catch {
    return {}
  }
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', { email, password })
  return data
}

export type RegistroClinicaPayload = {
  empresa_nombre: string
  ciudad: string
  pais: string
  tipo_establecimiento: 'independiente' | 'clinica' | 'guarderia' | 'peluqueria'
  departamento?: string
  canal_origen: string
  distribuidor: string
  usuario_nombre: string
  usuario_email: string
  usuario_telefono?: string
  usuario_password: string
  recaptcha_token?: string
}

export type RegistroPublicoResponse = {
  solicitud_recibida: boolean
  message: string
}

export async function registroClinica(payload: RegistroClinicaPayload): Promise<RegistroPublicoResponse> {
  const { data } = await apiClient.post<RegistroPublicoResponse>('/public/registro', payload)
  return data
}

export type SessionMe = {
  email: string
  usuario_nombre: string
  empresa_nombre: string
}

export async function fetchSessionMe(): Promise<SessionMe> {
  const { data } = await apiClient.get<SessionMe>('/auth/me')
  return data
}

export async function activarRegistro(token: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/public/activar', { token })
  return data
}

export function userFromToken(accessToken: string): UserInfo {
  const partial = parseJwtPayload(accessToken)
  return {
    userId: partial.userId ?? 0,
    empresaId: partial.empresaId ?? 0,
    rolId: partial.rolId ?? 0,
    email: partial.email,
  }
}
