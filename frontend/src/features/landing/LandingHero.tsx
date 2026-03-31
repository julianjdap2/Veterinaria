import { Link } from 'react-router-dom'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-25%,rgba(16,185,129,0.12),transparent)]" />
      <div className="relative mx-auto max-w-6xl text-center">
        <p className="mb-5 inline-flex items-center rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900 shadow-sm">
          Plataforma clínica
        </p>
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
          <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-600 bg-clip-text text-transparent">
            Operación clara
          </span>
          <br className="hidden sm:block" />
          <span className="text-stone-900"> para tu consulta veterinaria</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-600 sm:text-xl">
          Unifica pacientes, tutores, agenda y ventas con procesos ordenados. Menos fricción operativa, más foco en
          el cuidado animal.
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-6">
          <Link
            to="/registro"
            className="inline-flex w-full min-w-[220px] items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-700/25 ring-2 ring-emerald-400/35 transition hover:from-emerald-700 hover:to-teal-700 sm:w-auto"
          >
            Crear acceso
            <span className="ml-2 inline-block transition group-hover:translate-x-0.5" aria-hidden>
              →
            </span>
          </Link>
          <a
            href="#modulos"
            className="inline-flex items-center rounded-2xl border-2 border-emerald-300/90 bg-white px-6 py-3.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-teal-400 hover:bg-emerald-50/80"
          >
            Explorar módulos
          </a>
        </div>
      </div>
    </section>
  )
}
