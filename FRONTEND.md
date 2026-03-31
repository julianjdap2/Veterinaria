# Guía rápida – Frontend y API

El **contrato HTTP completo** (auth, CORS, errores, paginación, roles, recursos) está en **[docs/API.md](docs/API.md)**. Actualizar allí cuando cambie la API; este archivo solo orienta al desarrollador del front en este repo.

## Enlace útil

- **OpenAPI interactiva** (con el backend levantado): `http://127.0.0.1:8000/docs`
- **Contrato detallado:** [docs/API.md](docs/API.md)
- **Proyecto front:** [frontend/README.md](frontend/README.md) · **UI del panel:** [frontend/docs/UI-PANEL.md](frontend/docs/UI-PANEL.md)

## Orden sugerido de implementación (nuevas pantallas)

1. Login, token, 401 → login.
2. Layout y navegación por **rol** (incl. **SUPERADMIN** si aplica).
3. Dashboard, clientes, mascotas (catálogo especies/razas).
4. Consultas y citas (agenda).
5. Productos, ventas (POS / listado).
6. Usuarios, auditoría (según permisos).
7. Config empresa (operativa, notificaciones); módulos **superadmin** solo rol **4**.
