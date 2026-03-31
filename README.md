# Veterinaria
Proyecto Veterinaria (API FastAPI + frontend React/Vite, multi-tenant por empresa).

- **Backend (API):** [backend/README.md](backend/README.md) – arranque, `.env` (plantilla `backend/.env.example`), migraciones, endpoints, cron.
- **Frontend:** [frontend/README.md](frontend/README.md) – instalación, estructura, build.
- **Contrato API:** [docs/API.md](docs/API.md) · guía corta [FRONTEND.md](FRONTEND.md).
- **Índice de documentación** (checklists, planes, flujos): [docs/README.md](docs/README.md).
- **UI del panel (componentes y convenciones):** [frontend/docs/UI-PANEL.md](frontend/docs/UI-PANEL.md).
- **Arquitectura del frontend:** [frontend/docs/ARCHITECTURE.md](frontend/docs/ARCHITECTURE.md).
- **Checklist de producto:** [docs/CHECKLIST_PRODUCTO.md](docs/CHECKLIST_PRODUCTO.md).
- **Planes y límites (SaaS):** [docs/PLANES_Y_LIMITES.md](docs/PLANES_Y_LIMITES.md).
- **Roadmap módulos y parametrización:** [docs/ROADMAP_MODULOS_Y_PARAMETROS.md](docs/ROADMAP_MODULOS_Y_PARAMETROS.md).

### Navegación “volver” (React Router)

- Desde **Agenda → Mascota** se envía `state={{ from: '/citas' }}` para que la ficha muestre “Volver a citas”.
- **Detalle de cita** usa `state={{ from: '/mascotas', mascotaId }}` cuando se entra desde la ficha mascota, para volver a esa ficha.
- **Ventas** puede enviar `state={{ from: '/ventas' }}` al abrir el detalle para que “Volver” regrese al listado.
- **Notificaciones (fase D):** pantalla admin **`/configuracion-notificaciones`**; cron **`POST /cron/recordatorios-citas`** (ver `backend/README.md`).
