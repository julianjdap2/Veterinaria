import { useQuery } from '@tanstack/react-query'
import { fetchPublicClinicas, resolveClinicaLogoUrl, type PublicClinicaItem } from './publicApi'

function MarqueeItems({ items }: { items: PublicClinicaItem[] }) {
  const loop = items.length >= 4 ? items : [...items, ...items, ...items, ...items]
  const doubled = [...loop, ...loop]

  return (
    <div className="landing-marquee relative overflow-hidden py-2">
      <div className="landing-marquee-track flex w-max items-center gap-14 pr-14">
        {doubled.map((c, idx) => (
          <div
            key={`${c.id}-${idx}`}
            className="flex h-14 shrink-0 items-center justify-center px-3 sm:h-16"
          >
            <ClinicaMark clinica={c} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ClinicaMark({ clinica }: { clinica: PublicClinicaItem }) {
  const src = resolveClinicaLogoUrl(clinica.logo_url)
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="max-h-10 max-w-[140px] object-contain opacity-90 grayscale-[0.15] sm:max-h-12 sm:max-w-[160px]"
        loading="lazy"
        decoding="async"
      />
    )
  }
  return (
    <span
      className="max-w-[200px] truncate text-sm font-bold uppercase tracking-wider text-stone-500 sm:text-base"
      title={clinica.nombre}
    >
      {clinica.nombre}
    </span>
  )
}

export function LandingSocialProof() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public', 'clinicas'],
    queryFn: fetchPublicClinicas,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const hasData = data && data.length > 0

  return (
    <section
      className="landing-trust-strip relative border-y border-emerald-200/35 bg-gradient-to-b from-stone-50 via-emerald-50/35 to-stone-50 py-10"
      aria-label="Clínicas que confían en la plataforma"
    >
      <div className="landing-paw-edge-top pointer-events-none absolute inset-x-0 top-0 h-4 opacity-[0.12]" />
      <div className="landing-paw-edge-bottom pointer-events-none absolute inset-x-0 bottom-0 h-4 opacity-[0.12]" />

      <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-stone-600 sm:text-base">
          Clínicas que ya operan con orden y trazabilidad
        </p>

        {isLoading && (
          <div className="mt-8 flex justify-center gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-28 animate-pulse rounded-lg bg-stone-200/80 sm:h-12 sm:w-32"
              />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <p className="mt-6 text-sm text-stone-500">
            No pudimos cargar las clínicas en este momento. Intenta más tarde.
          </p>
        )}

        {!isLoading && !isError && hasData && <MarqueeItems items={data} />}

        {!isLoading && !isError && !hasData && (
          <p className="mt-6 text-sm text-stone-500">
            Pronto mostraremos aquí las marcas de las clínicas registradas. Tu organización puede ser la
            primera.
          </p>
        )}
      </div>
    </section>
  )
}
