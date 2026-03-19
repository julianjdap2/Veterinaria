import { useEffect, useState } from 'react'

/**
 * Devuelve un valor que se actualiza solo después de `delay` ms sin cambios.
 * Útil para búsquedas: no disparar API en cada tecla.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
