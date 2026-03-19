/**
 * HTTP client con interceptores para auth y normalización de errores.
 * Base para todas las llamadas a la API; desacoplado del estado de UI.
 */

import axios, { type AxiosError } from 'axios'
import { getToken, clearAuth } from '../core/auth-store'
import { normalizeApiError, type ApiErrorPayload } from './errors'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: ApiErrorPayload['error'] }>) => {
    if (error.response?.status === 401) {
      clearAuth()
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
    return Promise.reject(normalizeApiError(error as AxiosError<ApiErrorPayload>))
  }
)

export default apiClient
