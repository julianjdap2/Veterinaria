import { useState } from 'react'
import { Link } from 'react-router-dom'

const tabs = [
  {
    id: 'clinica',
    label: 'Historia clínica',
    headline: ['Historias clínicas ', 'especializadas', ' y centralizadas'] as const,
    body: 'Registra consultas, evolución y documentación asociada a cada mascota. Pensado para que el equipo comparta el mismo historial con contexto completo.',
    image: '/login/photo-2.jpg',
    alt: 'Vista de software veterinario',
  },
  {
    id: 'gestion',
    label: 'Gestión y administración',
    headline: ['Gestiona tu clínica ', 'como nunca', ' lo hiciste'] as const,
    body: 'Clientes, mascotas, inventario y ventas conectados. Menos hojas de cálculo y más control operativo en tiempo real.',
    image: '/login/photo-3.jpg',
    alt: 'Gestión de clínica veterinaria',
  },
  {
    id: 'agenda',
    label: 'Agenda',
    headline: ['Controla tu agenda ', 'y la de tu equipo', ' con claridad'] as const,
    body: 'Coordina citas y disponibilidad. Visibilidad compartida para recepción y médicos veterinarios.',
    image: '/login/photo-1.jpg',
    alt: 'Agenda veterinaria',
  },
  {
    id: 'alertas',
    label: 'Recordatorios y alertas',
    headline: ['Mejora la comunicación ', 'con tus clientes', ' y tutores'] as const,
    body: 'Base para recordatorios y seguimiento por canales que vayas habilitando (email, WhatsApp según configuración).',
    image: '/login/photo-2.jpg',
    alt: 'Comunicación con tutores',
  },
] as const

export function LandingModulesTabs() {
  const [active, setActive] = useState(0)
  const tab = tabs[active]

  return (
    <section id="modulos" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-extrabold text-stone-900 sm:text-4xl">
          <span className="text-emerald-700">Capacidades</span>{' '}
          <span className="text-stone-800">por área</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-stone-600">
          Explora las áreas principales. El detalle de cada flujo se irá ampliando según el roadmap del producto.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                i === active
                  ? 'bg-violet-800 text-white shadow-md ring-2 ring-violet-300/50'
                  : 'border border-stone-200 bg-white text-stone-700 hover:border-amber-300 hover:bg-amber-50/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border-2 border-emerald-200/70 bg-white p-6 shadow-panel ring-1 ring-emerald-100/50 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h3 className="text-2xl font-bold text-stone-900 sm:text-3xl">
                {tab.headline[0]}
                <span className="bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
                  {tab.headline[1]}
                </span>
                {tab.headline[2]}
              </h3>
              <p className="mt-4 leading-relaxed text-stone-600">{tab.body}</p>
              <Link
                to="/registro"
                className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-700/20 transition hover:from-emerald-700 hover:to-teal-700"
              >
                Solicitar acceso →
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-inner">
              <img src={tab.image} alt={tab.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
