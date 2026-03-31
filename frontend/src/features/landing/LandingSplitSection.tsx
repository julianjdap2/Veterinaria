import { Link } from 'react-router-dom'

export function LandingSplitSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="order-2 lg:order-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Hecho para{' '}
            <span className="text-emerald-700">equipos que priorizan</span> el detalle clínico
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-stone-600">
            Reduce reprocesos entre recepción y consultorio: misma fuente de verdad para tutores, mascotas, agenda
            y ventas. Escalable cuando incorporen nuevos módulos.
          </p>
          <Link
            to="/registro"
            className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-700/25 transition hover:from-emerald-700 hover:to-teal-700"
          >
            Probar el panel →
          </Link>
        </div>
        <div className="relative order-1 lg:order-2">
          <div className="overflow-hidden rounded-[2rem] border-2 border-amber-200/60 bg-white shadow-2xl ring-2 ring-stone-200/60">
            <img
              src="/login/photo-1.jpg"
              alt="Equipo veterinario"
              className="h-full w-full object-cover object-center"
              width={800}
              height={600}
              loading="lazy"
            />
          </div>
          <div className="absolute -left-6 -top-6 hidden h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/25 to-cyan-400/20 blur-2xl lg:block" />
        </div>
      </div>
    </section>
  )
}
