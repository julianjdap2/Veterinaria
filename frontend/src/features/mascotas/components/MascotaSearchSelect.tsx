import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { useMascotas } from '../hooks/useMascotas'
import { fetchMascotaById } from '../api'
import {
  PAGE_SIZE_SELECT,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
} from '../../../core/listDefaults'
import { Button } from '../../../shared/ui/Button'

type Props = {
  value: number | null
  onChange: (mascotaId: number | null) => void
  disabled?: boolean
  className?: string
}

/**
 * Selección de mascota por búsqueda (nombre / tutor), sin cargar 500+ filas.
 */
export function MascotaSearchSelect({ value, onChange, disabled, className }: Props) {
  const [q, setQ] = useState('')
  const debounced = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS)

  const { data: selected } = useQuery({
    queryKey: ['mascotas', 'detail', value],
    queryFn: () => fetchMascotaById(value!),
    enabled: value != null && value > 0,
  })

  const searchActive = value == null && !disabled
  const canQuery = searchActive && debounced.length >= SEARCH_MIN_CHARS

  const { data: listData, isFetching } = useMascotas(
    {
      page: 1,
      page_size: PAGE_SIZE_SELECT,
      busqueda: canQuery ? debounced : undefined,
      incluir_inactivos: false,
    },
    { enabled: canQuery }
  )
  const items = listData?.items ?? []

  if (value != null && selected) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
          {selected.nombre}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => {
            onChange(null)
            setQ('')
          }}
        >
          Cambiar
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={disabled}
        placeholder={`Buscar mascota (${SEARCH_MIN_CHARS}+ caracteres)…`}
        className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
        autoComplete="off"
      />
      {searchActive && debounced.length > 0 && debounced.length < SEARCH_MIN_CHARS && (
        <p className="mt-1 text-xs text-slate-500">Escribe al menos {SEARCH_MIN_CHARS} caracteres.</p>
      )}
      {canQuery && isFetching && <p className="mt-2 text-xs text-slate-500">Buscando…</p>}
      {canQuery && !isFetching && items.length === 0 && (
        <p className="mt-2 text-xs text-amber-700">Sin resultados.</p>
      )}
      {canQuery && items.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
          {items.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-primary-50"
                onClick={() => {
                  onChange(m.id)
                  setQ('')
                }}
              >
                <span className="font-medium">{m.nombre}</span>
                {m.cliente_nombre ? (
                  <span className="text-slate-500"> · {m.cliente_nombre}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
