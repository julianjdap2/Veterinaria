import { useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../../core/branding'

const slides = [
  {
    title: 'Inventario y ventas alineados al consultorio',
    body: 'Productos e insumos conectados a la operación diaria. Cuando definan planes comerciales, podrás segmentar funciones avanzadas sin rehacer la base.',
    image: '/login/photo-3.jpg',
    alt: 'Inventario clínico',
  },
  {
    title: 'Seguimiento y recordatorios configurables',
    body: 'Mensajes y avisos según la configuración de tu clínica: plantillas, canales y reglas que el equipo va activando con el tiempo.',
    image: '/login/photo-2.jpg',
    alt: 'Comunicación con clientes',
  },
  {
    title: 'Flujos clínicos que escalan contigo',
    body: 'Estructura pensada para crecer hacia hospitalización, cirugías y seguimiento por paciente sin perder trazabilidad.',
    image: '/login/photo-1.jpg',
    alt: 'Atención clínica',
  },
] as const

export function LandingProCarousel() {
  const [i, setI] = useState(0)
  const slide = slides[i]
  const n = slides.length

  return (
    <section id="pro" className="scroll-mt-24 bg-gradient-to-b from-stone-950 via-emerald-950/30 to-stone-950 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-400/95">
            {APP_NAME} Plus
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-stone-50 sm:text-4xl">
            Capacidades ampliadas para operaciones exigentes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-stone-400">
            Vista previa del formato; el catálogo final dependerá del modelo de planes que definan.
          </p>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[2rem] border border-emerald-800/50 bg-stone-900 shadow-2xl shadow-emerald-950/40">
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
                <h3 className="text-2xl font-bold leading-tight text-stone-50 sm:text-3xl">{slide.title}</h3>
                <p className="mt-4 leading-relaxed text-stone-400">{slide.body}</p>
                <Link
                  to="/registro"
                  className="mt-10 inline-flex w-fit items-center rounded-2xl border-2 border-amber-400/50 bg-stone-950/80 px-6 py-3 text-sm font-semibold text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)] transition hover:border-amber-300 hover:bg-stone-900"
                >
                  Me interesa Plus →
                </Link>
                <p className="mt-4 text-xs text-stone-500">
                  El acceso sigue siendo el mismo inicio de sesión; aquí no hay cobro aún.
                </p>
              </div>
              <div className="relative min-h-[240px] sm:min-h-[320px] lg:min-h-0">
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="h-full w-full object-cover object-center lg:rounded-r-[2rem]"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent lg:bg-gradient-to-l" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setI((i - 1 + n) % n)}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-stone-600 bg-stone-900/90 p-2 text-stone-200 backdrop-blur transition hover:bg-stone-800"
            aria-label="Anterior"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setI((i + 1) % n)}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-stone-600 bg-stone-900/90 p-2 text-stone-200 backdrop-blur transition hover:bg-stone-800"
            aria-label="Siguiente"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition ${idx === i ? 'w-8 bg-emerald-400' : 'w-2 bg-stone-600'}`}
              aria-label={`Ir a slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
