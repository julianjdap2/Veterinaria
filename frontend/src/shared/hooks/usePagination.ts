import { useCallback, useMemo } from 'react'

export interface UsePaginationOptions {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function usePagination(
  page: number,
  pageSize: number,
  total: number,
  onPageChange: (page: number) => void
) {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  )
  const hasNext = page < totalPages
  const hasPrev = page > 1
  const goNext = useCallback(() => {
    if (hasNext) onPageChange(page + 1)
  }, [hasNext, page, onPageChange])
  const goPrev = useCallback(() => {
    if (hasPrev) onPageChange(page - 1)
  }, [hasPrev, page, onPageChange])
  return { totalPages, hasNext, hasPrev, goNext, goPrev }
}
