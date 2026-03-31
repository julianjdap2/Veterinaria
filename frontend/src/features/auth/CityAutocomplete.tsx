import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Input } from '../../shared/ui/Input'

type Props = {
  fieldKey: string
  ciudad: string
  pais: string
  onCiudadChange: (v: string) => void
  onPaisChange: (v: string) => void
  /** Departamento/región al elegir una ciudad en la lista (p. ej. Antioquia). Se limpia al escribir a mano. */
  onDepartamentoChange?: (v: string) => void
  ciudadError?: string
  paisError?: string
  disabled?: boolean
  /** Texto bajo el campo ciudad (sustituye el hint por defecto). */
  ciudadHint?: string
  /** Sesgo regional para Google Places (reduce errores y prioriza resultados cercanos al mapa). */
  locationBias?: { lat: number; lng: number; radiusM: number }
}

type GooglePred = { place_id: string; label: string }

type NominatimItem = {
  display_name: string
  address?: Record<string, string>
  lat: string
  lon: string
}

/** Etiqueta corta para la lista: "Medellín - Antioquia" (términos de más específico a general). */
function formatGooglePredictionLabel(pred: google.maps.places.AutocompletePrediction): string {
  const terms = pred.terms
  if (terms?.length) {
    const city = terms[0].value
    if (terms.length === 1) return city
    if (terms.length === 2) return `${city} - ${terms[1].value}`
    const region = terms[terms.length - 2]?.value
    return region ? `${city} - ${region}` : city
  }
  const sf = pred.structured_formatting
  if (sf?.main_text) {
    const sec = sf.secondary_text?.split(',')[0]?.trim()
    return sec ? `${sf.main_text} - ${sec}` : sf.main_text
  }
  return pred.description ?? ''
}

function formatNominatimLabel(item: NominatimItem): string {
  const a = item.address ?? {}
  const city =
    a.city || a.town || a.village || a.municipality || item.display_name.split(',')[0]?.trim() || ''
  const region = a.state || a.region || a.province || a.county || ''
  if (city && region) return `${city} - ${region}`
  const parts = item.display_name.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]} - ${parts[1]}`
  return item.display_name
}

function extractPlaceParts(place: google.maps.places.PlaceResult): { city: string; country: string; region: string } {
  let city = ''
  let country = ''
  let region = ''
  const comps = place.address_components ?? []
  for (const c of comps) {
    const t = c.types
    if (t.includes('locality')) city = c.long_name
    if (t.includes('administrative_area_level_1')) region = c.long_name
    if (t.includes('country')) country = c.long_name
  }
  if (!city) {
    for (const c of comps) {
      if (c.types.includes('administrative_area_level_1')) city = c.long_name
    }
  }
  if (!city) {
    for (const c of comps) {
      if (c.types.includes('administrative_area_level_2')) city = c.long_name
    }
  }
  if (!city && place.name) city = place.name
  return { city, country, region }
}

function nominatimPlaceParts(item: NominatimItem): { city: string; country: string; region: string } {
  const a = item.address ?? {}
  const city =
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.county ||
    a.state ||
    item.display_name.split(',')[0]?.trim() ||
    ''
  const country = a.country || ''
  const region = a.state || a.region || a.province || ''
  return { city, country, region }
}

const DEBOUNCE_MS = 320

export function CityAutocomplete({
  fieldKey,
  ciudad,
  pais,
  onCiudadChange,
  onPaisChange,
  onDepartamentoChange,
  ciudadError,
  paisError,
  disabled,
  ciudadHint,
  locationBias,
}: Props) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [mapsReady, setMapsReady] = useState(false)
  const [inputValue, setInputValue] = useState(ciudad)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googlePreds, setGooglePreds] = useState<GooglePred[]>([])
  const [nomiItems, setNomiItems] = useState<NominatimItem[]>([])
  const [highlight, setHighlight] = useState(0)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const useGoogle = Boolean(apiKey)

  useEffect(() => {
    setInputValue(ciudad)
  }, [fieldKey, ciudad])

  useEffect(() => {
    if (!useGoogle) {
      setMapsReady(true)
      return
    }
    if (window.google?.maps?.places) {
      setMapsReady(true)
      return
    }
    const existing = document.getElementById('google-maps-places-sdk')
    if (existing) {
      const t = window.setInterval(() => {
        if (window.google?.maps?.places) {
          window.clearInterval(t)
          setMapsReady(true)
        }
      }, 80)
      return () => window.clearInterval(t)
    }
    const script = document.createElement('script')
    script.id = 'google-maps-places-sdk'
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey!)}&libraries=places&language=es`
    script.onload = () => setMapsReady(true)
    document.head.appendChild(script)
  }, [apiKey, useGoogle])

  const fetchGooglePredictions = useCallback(
    (q: string) => {
      if (!window.google?.maps?.places || q.length < 2) {
        setGooglePreds([])
        setLoading(false)
        return
      }
      const svc = new google.maps.places.AutocompleteService()
      const request: google.maps.places.AutocompletionRequest = {
        input: q,
        types: ['(cities)'],
      }
      if (
        locationBias &&
        Number.isFinite(locationBias.lat) &&
        Number.isFinite(locationBias.lng) &&
        locationBias.radiusM > 0
      ) {
        request.locationBias = {
          center: new google.maps.LatLng(locationBias.lat, locationBias.lng),
          radius: Math.min(Math.max(locationBias.radiusM, 5000), 200000),
        }
      }
      svc.getPlacePredictions(request, (predictions, status) => {
        setLoading(false)
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
          setGooglePreds([])
          return
        }
        setGooglePreds(
          predictions.map((p) => ({
            place_id: p.place_id ?? '',
            label: formatGooglePredictionLabel(p),
          }))
        )
      })
    },
    [locationBias],
  )

  const fetchNominatim = useCallback(async (q: string) => {
    if (q.length < 3) {
      setNomiItems([])
      return
    }
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('q', q)
      url.searchParams.set('format', 'json')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('limit', '8')
      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'es',
        },
      })
      if (!res.ok) {
        setNomiItems([])
        return
      }
      const data = (await res.json()) as NominatimItem[]
      setNomiItems(Array.isArray(data) ? data : [])
    } catch {
      setNomiItems([])
    }
  }, [])

  const scheduleSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (useGoogle && mapsReady) {
          if (q.length < 2) {
            setGooglePreds([])
            setLoading(false)
            return
          }
          setLoading(true)
          fetchGooglePredictions(q)
        } else if (!useGoogle) {
          setLoading(true)
          void fetchNominatim(q).finally(() => setLoading(false))
        }
      }, DEBOUNCE_MS)
    },
    [fetchGooglePredictions, fetchNominatim, mapsReady, useGoogle]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const selectGooglePlace = useCallback(
    (placeId: string) => {
      if (!window.google?.maps?.places || !placeId) return
      const svc = new google.maps.places.PlacesService(document.createElement('div'))
      svc.getDetails(
        {
          placeId,
          fields: ['address_components', 'name', 'formatted_address'],
        },
        (place, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return
          const { city, country, region } = extractPlaceParts(place)
          const display = region && city ? `${city} - ${region}` : city || place.name || ''
          setInputValue(display)
          if (city) onCiudadChange(city)
          if (country) onPaisChange(country)
          onDepartamentoChange?.(region)
          setOpen(false)
          setGooglePreds([])
        }
      )
    },
    [onCiudadChange, onPaisChange, onDepartamentoChange]
  )

  const selectNominatim = useCallback(
    (item: NominatimItem) => {
      const { city, country, region } = nominatimPlaceParts(item)
      setInputValue(formatNominatimLabel(item))
      if (city) onCiudadChange(city)
      if (country) onPaisChange(country)
      onDepartamentoChange?.(region)
      setOpen(false)
      setNomiItems([])
    },
    [onCiudadChange, onPaisChange, onDepartamentoChange]
  )

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const itemsCount = useGoogle ? googlePreds.length : nomiItems.length

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || itemsCount === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, itemsCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (useGoogle && googlePreds[highlight]) {
        selectGooglePlace(googlePreds[highlight].place_id)
      } else if (!useGoogle && nomiItems[highlight]) {
        selectNominatim(nomiItems[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    setHighlight(0)
  }, [googlePreds, nomiItems])

  if (!useGoogle) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative sm:col-span-1" ref={wrapRef}>
          <label className="mb-1.5 block text-sm font-medium text-stone-800" htmlFor={`reg-ciudad-${fieldKey}`}>
            Ciudad o municipio
          </label>
          <input
            ref={inputRef}
            id={`reg-ciudad-${fieldKey}`}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value
              setInputValue(v)
              onCiudadChange(v)
              onDepartamentoChange?.('')
              setOpen(true)
              scheduleSearch(v)
            }}
            onFocus={() => {
              setOpen(true)
              if (inputValue.length >= 3) scheduleSearch(inputValue)
            }}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder="Escribe para buscar ciudad…"
            className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/50 disabled:bg-stone-50"
          />
          {loading && (
            <span className="pointer-events-none absolute right-3 top-9 text-xs text-stone-400">Buscando…</span>
          )}
          {open && nomiItems.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="city-autocomplete-dropdown absolute z-[100] mt-1 max-h-56 w-full overflow-auto rounded-xl border border-stone-200 bg-white py-1 text-sm shadow-lg"
            >
              {nomiItems.map((item, i) => (
                <li key={`${item.lat}-${item.lon}-${i}`} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    className={`flex w-full px-3 py-2.5 text-left hover:bg-violet-50 ${i === highlight ? 'bg-violet-50' : ''}`}
                    onMouseDown={(ev) => {
                      ev.preventDefault()
                      selectNominatim(item)
                    }}
                  >
                    <span className="line-clamp-2 text-stone-800">{formatNominatimLabel(item)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {ciudadError && (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {ciudadError}
            </p>
          )}
          <p className="mt-1 text-xs text-stone-500">
            {ciudadHint ??
              'Búsqueda en OpenStreetMap (mín. 3 letras). El país se rellena al elegir una opción.'}
          </p>
        </div>
        <Input
          label="País"
          value={pais}
          onChange={(e) => onPaisChange(e.target.value)}
          placeholder="País"
          disabled={disabled}
          error={paisError}
        />
      </div>
    )
  }

  if (!mapsReady) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-800">Ciudad o municipio</label>
          <div className="h-10 animate-pulse rounded-xl bg-stone-200" />
        </div>
        <Input label="País" value={pais} onChange={() => {}} placeholder="Cargando mapas…" disabled />
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="relative sm:col-span-1" ref={wrapRef}>
        <label className="mb-1.5 block text-sm font-medium text-stone-800" htmlFor={`reg-ciudad-${fieldKey}`}>
          Ciudad o municipio
        </label>
        <input
          ref={inputRef}
          id={`reg-ciudad-${fieldKey}`}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value
            setInputValue(v)
            onCiudadChange(v)
            onDepartamentoChange?.('')
            setOpen(true)
            scheduleSearch(v)
          }}
          onFocus={() => {
            setOpen(true)
            if (inputValue.length >= 2) scheduleSearch(inputValue)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => onCiudadChange(inputValue)}
          disabled={disabled}
          placeholder="Escribe para buscar ciudad…"
          className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/50 disabled:bg-stone-50"
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-9 text-xs text-stone-400">Buscando…</span>
        )}
        {open && googlePreds.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="city-autocomplete-dropdown absolute z-[100] mt-1 max-h-56 w-full overflow-auto rounded-xl border border-stone-200 bg-white py-1 text-sm shadow-lg"
          >
            {googlePreds.map((p, i) => (
              <li key={p.place_id} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  className={`flex w-full px-3 py-2.5 text-left hover:bg-violet-50 ${i === highlight ? 'bg-violet-50' : ''}`}
                  onMouseDown={(ev) => {
                    ev.preventDefault()
                    selectGooglePlace(p.place_id)
                  }}
                >
                  <span className="text-stone-800">{p.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {ciudadError && (
          <p className="mt-1.5 text-sm text-red-600" role="alert">
            {ciudadError}
          </p>
        )}
        <p className="mt-1 text-xs text-stone-500">
          {ciudadHint ?? 'Sugerencias mientras escribes; al elegir, se completa el país.'}
        </p>
      </div>
      <Input
        label="País"
        value={pais}
        onChange={(e) => onPaisChange(e.target.value)}
        placeholder="País"
        disabled={disabled}
        error={paisError}
      />
    </div>
  )
}
