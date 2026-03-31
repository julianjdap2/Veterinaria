# Frontend – Vet System

Frontend del sistema de gestión veterinaria: React 18, TypeScript, Vite, TanStack Query, Zustand, Tailwind CSS.

## Requisitos

- Node 18+
- Backend API corriendo (por defecto se asume proxy a `http://localhost:8000` vía `/api`)

**Contrato de la API (auth, errores, roles):** [../docs/API.md](../docs/API.md).

## Instalación y desarrollo

```bash
cd frontend
npm install
npm run dev
```

La app se sirve en `http://localhost:5173`. La **página de inicio** pública es `/` (marketing); el panel sigue en `/dashboard`, `/clientes`, etc. Las peticiones a `/api/*` se redirigen al backend (configurar en `vite.config.ts` si el backend usa otro puerto).

Marca y WhatsApp en landing: variables opcionales en `.env` — ver `.env.example` (`VITE_APP_NAME`, `VITE_WHATSAPP_URL`).

## Variables de entorno

| Variable        | Descripción |
|----------------|-------------|
| `VITE_API_URL` | URL base de la API. Por defecto `/api` (proxy en dev). En producción usar la URL real del backend. |

Copia `.env.example` a `.env` y ajusta si hace falta.

## Estructura (arquitectura escalable)

```
src/
  api/              # Cliente HTTP, normalización de errores, tipos de API
  core/             # Auth store (Zustand), constantes (roles), tipos globales
  features/         # Módulos por dominio
    auth/           # Login, ProtectedRoute, RoleRoute
    clientes/       # CRUD dueños
    mascotas/       # CRUD pacientes
    citas/            # Agenda
    consultas/      # Historial clínico
    productos/      # Inventario / catálogo
    ventas/         # Listado, POS, nueva venta
    usuarios/       # Gestión de usuarios (según rol)
    audit/          # Auditoría (ADMIN)
    dashboard/      # Panel inicio
    empresa/        # Config operativa y notificaciones
    superadmin/     # Empresas y planes (SUPERADMIN)
    catalogo/       # Especies, razas (hooks compartidos)
  shared/           # UI (PageHeader, DataListPanel, Table, …), layout, hooks genéricos
  app/              # Router y rutas
```

- **Estado servidor:** TanStack Query (cache, loading, refetch).
- **Estado cliente (auth):** Zustand con persist en `sessionStorage`.
- **Lógica de negocio:** en servicios (`features/*/api.ts`) y hooks (`features/*/hooks/`), no en componentes.

**Más detalle:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). **Convenciones de UI del panel:** [docs/UI-PANEL.md](docs/UI-PANEL.md).

## Build y preview

```bash
npm run build
npm run preview
```

## CORS

En desarrollo con proxy (`/api` → backend), el navegador no hace peticiones cross-origin al API. Si usas `VITE_API_URL` apuntando directamente al backend, configura `CORS_ORIGINS` en el backend (por defecto ya incluye `5173`; ver `backend/.env.example`).
