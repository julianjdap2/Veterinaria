import { Link } from 'react-router-dom'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Card } from '../../shared/ui/Card'

/**
 * Reservado para futura app móvil / portal del dueño: consumo del plan, alertas, upgrades.
 */
export function AppDuenoPlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Inicio', to: '/dashboard' }, { label: 'App del dueño' }]}
        title="App del dueño"
        subtitle="Espacio reservado para que el tutor consulte su plan, beneficios restantes y recordatorios."
      />
      <Card className="p-8 text-center">
        <p className="text-slate-700">
          Esta sección se conectará más adelante con un portal o app para propietarios (sin datos sensibles hasta
          definir autenticación y permisos).
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block text-sm font-medium text-primary-600 hover:underline"
        >
          Volver al panel
        </Link>
      </Card>
    </div>
  )
}
