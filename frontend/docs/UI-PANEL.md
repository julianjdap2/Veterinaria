# UI panel clínico (Vet System)

Patrón unificado tipo panel profesional (inspiración OkVet) para **todas** las pantallas autenticadas.

## Contenedor de página

- Envolver el contenido en `mx-auto max-w-6xl space-y-6 pb-8` (listados y dashboards).
- Formularios estrechos: `max-w-3xl` o `max-w-2xl` según el caso.

## Cabecera: `PageHeader`

**Ubicación:** `src/shared/ui/PageHeader.tsx`

- `breadcrumbs`: `[{ label: 'Inicio', to: '/dashboard' }, { label: 'Módulo' }]` (el último suele sin `to`).
- `title`: título de pantalla (una línea).
- `subtitle`: texto auxiliar opcional.
- `actions`: botones principales a la derecha (ej. «Nuevo», filtros de periodo).
- `badge`: etiqueta opcional (estado, contador).

No usar `<h1 className="text-2xl font-bold">` suelto.

## Listados: `DataListPanel`

**Ubicación:** `src/shared/ui/DataListPanel.tsx`

- `kicker`: categoría corta en mayúsculas (ej. `Directorio`, `Listado`).
- `title` + `description`: encabezado del bloque.
- Barra de filtros/búsqueda: dentro del cuerpo, en un contenedor  
  `rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3`.
- `flush={true}` si la tabla debe ir sin padding lateral (como en ventas con tabla custom).

## Configuración: `SettingsPanel`

Pantallas de ajustes (notificaciones, config operativa): bloques con borde izquierdo de acento.

## Tablas: `Table` + componentes

**Ubicación:** `src/shared/ui/Table.tsx`

Usar `Table`, `TableHead`, `TableBody`, `TableRow`, `TableTh`, `TableTd` para consistencia de cabecera gris y hover.

## Tarjetas genéricas: `Card`

Útil para bloques dentro de una página ya encabezada; el título del `Card` no sustituye al `PageHeader` de la página.

## Nuevos módulos

1. Añadir ruta en `routes.tsx` y entrada en `AppLayout.tsx` (`NAV_ITEMS` con icono en `icons.tsx` si hace falta).
2. Primera sección del JSX: `PageHeader` + contenedor ancho.
3. Listados: `DataListPanel` + filtros + tabla.
4. Formularios de alta/edición: `PageHeader` con migas + formulario en `Card` o `SettingsPanel` según densidad.

## Referencia rápida de imports

```tsx
import { PageHeader } from '../../shared/ui/PageHeader'
import { DataListPanel } from '../../shared/ui/DataListPanel'
import { SettingsPanel } from '../../shared/ui/SettingsPanel'
```
