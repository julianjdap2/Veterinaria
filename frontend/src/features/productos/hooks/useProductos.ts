import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProductosListParams } from '../api'
import {
  fetchProductos,
  fetchProductoById,
  createProducto,
  updateProducto,
} from '../api'

export const productosKeys = {
  all: ['productos'] as const,
  list: (params: ProductosListParams) => [...productosKeys.all, 'list', params] as const,
  detail: (id: number) => [...productosKeys.all, 'detail', id] as const,
}

export function useProductos(params: ProductosListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productosKeys.list(params),
    queryFn: () => fetchProductos(params),
    enabled: options?.enabled !== false,
  })
}

export function useProductoDetail(id: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productosKeys.detail(id ?? 0),
    queryFn: () => fetchProductoById(id!),
    enabled: (options?.enabled !== false) && id != null && id > 0,
  })
}

export function useCreateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createProducto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productosKeys.all })
    },
  })
}

export function useUpdateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateProducto>[1] }) =>
      updateProducto(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: productosKeys.all })
      qc.invalidateQueries({ queryKey: productosKeys.detail(id) })
    },
  })
}
