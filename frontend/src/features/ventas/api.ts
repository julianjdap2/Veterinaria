import apiClient from '../../api/client'
import type { Venta, VentaCreate, VentaDetalleAmpliado } from '../../api/types'

export interface VentasListParams {
  page?: number
  page_size?: number
  consulta_id?: number
}

export interface VentasListResponse {
  items: Venta[]
  total: number
  page: number
  page_size: number
}

export async function fetchVentas(params: VentasListParams = {}): Promise<VentasListResponse> {
  const { data } = await apiClient.get<VentasListResponse>('/ventas', { params })
  return data
}

export async function fetchVentaById(id: number): Promise<Venta> {
  const { data } = await apiClient.get<Venta>(`/ventas/${id}`)
  return data
}

export async function fetchVentaDetalleAmpliado(id: number): Promise<VentaDetalleAmpliado> {
  const { data } = await apiClient.get<VentaDetalleAmpliado>(`/ventas/${id}/detalle-ampliado`)
  return data
}

export async function createVenta(payload: VentaCreate): Promise<Venta> {
  const { data } = await apiClient.post<Venta>('/ventas', payload)
  return data
}
