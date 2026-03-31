import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { useClientes } from '../hooks/useClientes'
import { fetchClienteById } from '../api'
import {
  PAGE_SIZE_SELECT,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
} from '../../../core/listDefaults'
import { Button } from '../../../shared/ui/Button'

type Props = {
  value: number | null
  onChange: (clienteId: number | null) => void
  disabled?: boolean
  className?: string
  /** Placeholder del campo de búsqueda */
  placeholder?: string
}

/**
 * Selección de cliente por búsqueda (nombre/documento), sin cargar listas masivas.
 */
export function ClienteSearchSelect({ value, onChange, disabled, className, placeholder }: Props) {
  const [q, setQ] = useState('')
  const debounced = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS)

  const { data: selected } = useQuery({
    queryKey: ['clientes', 'detail', value],
    queryFn: () => fetchClienteById(value!),
    enabled: value != null && value > 0,
  })

  const searchActive = value == null && !disabled
  const canQuery =
    searchActive && debounced.length >= SEARCH_MIN_CHARS

  const { data: listData, isFetching } = useClientes(
    {
      page: 1,
      page_size: PAGE_SIZE_SELECT,
      busqueda: canQuery ? debounced : undefined,
    },
    { enabled: canQuery }
  )
  const items = listData?.items ?? []

  if (value != null && selected) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
          {selected.nombre}
          {selected.documento ? (
            <span className="text-slate-500"> · {selected.documento}</span>
          ) : null}
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
        placeholder={
          placeholder ??
          `Buscar (${SEARCH_MIN_CHARS}+ caracteres: nombre o documento)…`
        }
        className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
        autoComplete="off"
      />
      {searchActive && debounced.length > 0 && debounced.length < SEARCH_MIN_CHARS && (
        <p className="mt-1 text-xs text-slate-500">Escribe al menos {SEARCH_MIN_CHARS} caracteres.</p>
      )}
      {canQuery && isFetching && <p className="mt-2 text-xs text-slate-500">Buscando…</p>}
      {canQuery && !isFetching && items.length === 0 && (
        <p className="mt-2 text-xs text-amber-700">Sin resultados. Prueba otro término.</p>
      )}
      {canQuery && items.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-primary-50"
                onClick={() => {
                  onChange(c.id)
                  setQ('')
                }}
              >
                <span className="font-medium">{c.nombre}</span>
                {c.documento ? <span className="text-slate-500"> · {c.documento}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
