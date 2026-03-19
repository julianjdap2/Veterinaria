# Frontend – Vet System

Frontend del sistema de gestión veterinaria: React 18, TypeScript, Vite, TanStack Query, Zustand, Tailwind CSS.

## Requisitos

- Node 18+
- Backend API corriendo (por defecto se asume proxy a `http://localhost:8000` vía `/api`)

## Instalación y desarrollo

```bash
cd frontend
npm install
npm run dev
```

La app se sirve en `http://localhost:5173`. Las peticiones a `/api/*` se redirigen al backend (configurar en `vite.config.ts` si el backend usa otro puerto).

## Variables de entorno

| Variable        | Descripción |
|----------------|-------------|
| `VITE_API_URL` | URL base de la API. Por defecto `/api` (proxy en dev). En producción usar la URL real del backend. |

Copia `.env.example` a `.env` y ajusta si hace falta.

## Estructura (arquitectura escalable)

```
src/
  api/              # Cliente HTTP, normalización de errores, tipos de API
  core/              # Auth store (Zustand), constantes (roles), tipos globales
  features/          # Módulos por dominio
    auth/            # Login, ProtectedRoute
    clientes/        # Listado, detalle, alta, hooks y servicio
    mascotas/        # (próximamente)
    citas/
    ...
  shared/            # UI reutilizable (Button, Input, Card, Table, Pagination, Alert), hooks, layout
  app/               # Router, rutas
```

- **Estado servidor:** TanStack Query (cache, loading, refetch).
- **Estado cliente (auth):** Zustand con persist en `sessionStorage`.
- **Lógica de negocio:** en servicios (`features/*/api.ts`) y hooks (`features/*/hooks/`), no en componentes.

## Build y preview

```bash
npm run build
npm run preview
```

## CORS

Si el front se sirve desde otro origen, configurar `CORS_ORIGINS` en el backend para incluir esa URL (ej. `http://localhost:5173`).
