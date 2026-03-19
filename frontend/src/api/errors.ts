/**
 * Normalización de errores de la API.
 * Todas las respuestas de error del backend siguen { error: { code, message, request_id?, details? } }.
 */

import type { AxiosError } from 'axios'

export interface ApiErrorPayload {
  error: {
    code: string
    message: string
    request_id?: string
    details?: unknown
  }
}

export class ApiError extends Error {
  readonly code: string
  readonly statusCode: number
  readonly requestId?: string
  readonly details?: unknown
  constructor(
    code: string,
    message: string,
    statusCode: number,
    requestId?: string,
    details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.requestId = requestId
    this.details = details
  }

  get isValidation(): boolean {
    return this.code === 'validation_error'
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401
  }

  get isForbidden(): boolean {
    return this.statusCode === 403
  }
}

export function normalizeApiError(err: AxiosError<ApiErrorPayload>): ApiError {
  const status = err.response?.status ?? 0
  const body = err.response?.data?.error
  if (body) {
    return new ApiError(
      body.code ?? 'unknown',
      body.message ?? 'Error de conexión',
      status,
      body.request_id,
      body.details
    )
  }
  const message =
    err.code === 'ECONNABORTED'
      ? 'La solicitud tardó demasiado'
      : err.message || 'Error de conexión'
  return new ApiError('network_error', message, status)
}
