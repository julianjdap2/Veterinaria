# Arquitectura del frontend

## Stack elegido y justificación

| Tecnología | Uso | Justificación |
|------------|-----|----------------|
| **React 18** | UI | Ecosistema maduro, buen equilibrio entre rendimiento y mantenibilidad. |
| **TypeScript** | Tipado estático | Contratos claros con la API, menos bugs en tiempo de ejecución. |
| **Vite** | Build y dev server | HMR rápido, salida optimizada, proxy integrado para la API. |
| **TanStack Query (React Query)** | Estado de servidor | Cache, deduplicación, loading/error, refetch; evita estado duplicado y lógica en componentes. |
| **Zustand** | Estado de auth | Mínimo y predecible; persist en sessionStorage sin bloquear el render. |
| **React Router v6** | Rutas | Rutas anidadas, layout único protegido, redirección post-login. |
| **Axios** | HTTP | Interceptores para Bearer y 401; normalización de errores en un solo lugar. |
| **Tailwind CSS** | Estilos | Diseño consistente, tokens (primary, etc.), sin CSS duplicado. |

## Estructura de carpetas (escalable)

- **api/** – Cliente HTTP, tipos de errores, tipos de DTOs. Sin estado de UI.
- **core/** – Auth store, constantes (roles), tipos globales (paginación).
- **features/** – Un módulo por dominio (auth, clientes, mascotas, citas, …). Cada uno puede tener:
  - `api.ts` – Llamadas a la API.
  - `hooks/` – useQuery/useMutation y hooks de negocio.
  - Componentes de página y formularios.
- **shared/** – UI reutilizable (Button, Input, Card, Table, Pagination, Alert), hooks genéricos (usePagination), layout (AppLayout).
- **app/** – Router y definición de rutas.

Contrato HTTP con el backend: **[../../docs/API.md](../../docs/API.md)**.

## Flujos principales

1. **Auth:** Login → token + user en Zustand (persist sessionStorage) → redirección a `from` o `/dashboard`. Interceptor Axios añade Bearer; en 401 limpia auth y dispara `auth:logout` → redirección a login.
2. **Listados:** Filtros y página en estado local; TanStack Query con queryKey que incluye filtros; invalidación tras mutaciones.
3. **Mutaciones:** useMutation → onSuccess invalidateQueries y navegación o cierre de modal; errores normalizados a ApiError y mostrados en UI.

## Seguridad

- Token en **sessionStorage** (se pierde al cerrar pestaña; menor superficie que localStorage ante XSS).
- No guardar datos sensibles en la URL.
- Errores de API mostrados con mensaje genérico al usuario; `request_id` solo para soporte.
- Menú y rutas según rol (ADMIN, VETERINARIO, RECEPCIÓN, SUPERADMIN); el backend aplica RBAC.

## Cómo extender un nuevo módulo

1. Añadir tipos en `api/types.ts` si no existen.
2. Crear `features/<modulo>/api.ts` con las llamadas al backend.
3. Crear hooks en `features/<modulo>/hooks/`.
4. Crear páginas con `PageHeader`, `DataListPanel` / `Card` / `SettingsPanel` según [UI-PANEL.md](UI-PANEL.md).
5. Registrar rutas en `app/routes.tsx` bajo el layout protegido; usar `RoleRoute` si el módulo es solo para ciertos roles.
6. Añadir entradas en `AppLayout` (`NAV_ITEMS`) e iconos en `shared/ui/icons.tsx` si hace falta.
