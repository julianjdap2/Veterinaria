import { Link } from 'react-router-dom'

/** Reservado para pricing / planes SaaS (cuando esté definido el modelo). */
export function LandingPlansPlaceholder() {
  return (
    <section id="planes" className="scroll-mt-24 bg-gradient-to-b from-stone-50 to-emerald-50/25 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-extrabold text-stone-900 sm:text-4xl">Planes y límites</h2>
        <p className="mt-4 text-lg text-stone-600">
          Estamos cerrando el modelo de suscripción. Si ya tienes credenciales, entra con tu cuenta habitual.
        </p>
        <div className="mt-10 rounded-[2rem] border-2 border-dashed border-violet-300 bg-white p-10 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-violet-700">En preparación</p>
          <p className="mt-2 text-stone-700">
            Aquí irá la comparativa de planes y la contratación. Mientras tanto, la operación usa el despliegue
            vigente.
          </p>
          <Link
            to="/registro"
            className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-700/20 hover:from-emerald-700 hover:to-teal-700"
          >
            Ir al acceso
          </Link>
        </div>
      </div>
    </section>
  )
}
