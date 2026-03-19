import apiClient from '../../api/client'
import type { Producto, ProductoCreate, CategoriaProducto } from '../../api/types'

export interface ProductosListParams {
  page?: number
  page_size?: number
  search?: string
  categoria_id?: number | null
  incluir_inactivos?: boolean
}

export async function fetchCategoriasProducto(): Promise<CategoriaProducto[]> {
  const { data } = await apiClient.get<CategoriaProducto[]>('/productos/categorias')
  return data
}

export async function createCategoriaProducto(nombre: string): Promise<CategoriaProducto> {
  const { data } = await apiClient.post<CategoriaProducto>('/productos/categorias', { nombre })
  return data
}

export interface ProductosListResponse {
  items: Producto[]
  total: number
  page: number
  page_size: number
}

export async function fetchProductos(params: ProductosListParams = {}): Promise<ProductosListResponse> {
  const { data } = await apiClient.get<ProductosListResponse>('/productos', { params })
  return data
}

export async function fetchProductoById(id: number): Promise<Producto> {
  const { data } = await apiClient.get<Producto>(`/productos/${id}`)
  return data
}

export async function createProducto(payload: ProductoCreate): Promise<Producto> {
  const { data } = await apiClient.post<Producto>('/productos', payload)
  return data
}

export async function updateProducto(
  id: number,
  payload: Partial<ProductoCreate> & { stock_ajuste?: number }
): Promise<Producto> {
  const { data } = await apiClient.patch<Producto>(`/productos/${id}`, payload)
  return data
}

export interface CargaMasivaResult {
  creados: number
  errores: { fila: number; mensaje: string }[]
}

export async function uploadCargaMasivaProductos(file: File): Promise<CargaMasivaResult> {
  const form = new FormData()
  form.append('archivo', file)
  const { data } = await apiClient.post<CargaMasivaResult>('/productos/carga-masiva', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/** Descarga la plantilla CSV desde el backend (incluye auth). */
export async function downloadPlantillaCsv(): Promise<void> {
  const { data } = await apiClient.get('/productos/plantilla-csv', {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_inventario.csv'
  a.click()
  URL.revokeObjectURL(url)
}
