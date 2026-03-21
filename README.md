# Veterinaria
Proyecto Veterinaria

- **Backend (API):** ver [backend/README.md](backend/README.md) – arranque, variables de entorno, endpoints.
- **Frontend:** antes de empezar el front, ver [FRONTEND.md](FRONTEND.md) – auth, errores, paginación y recomendaciones.
- **Checklist de producto:** [docs/CHECKLIST_PRODUCTO.md](docs/CHECKLIST_PRODUCTO.md).
- **Planes y límites (SaaS):** [docs/PLANES_Y_LIMITES.md](docs/PLANES_Y_LIMITES.md).
- **Roadmap módulos y parametrización:** [docs/ROADMAP_MODULOS_Y_PARAMETROS.md](docs/ROADMAP_MODULOS_Y_PARAMETROS.md).

### Navegación “volver” (React Router)

- Desde **Agenda → Mascota** se envía `state={{ from: '/citas' }}` para que la ficha muestre “Volver a citas”.
- **Detalle de cita** usa `state={{ from: '/mascotas', mascotaId }}` cuando se entra desde la ficha mascota, para volver a esa ficha.
- **Ventas** puede enviar `state={{ from: '/ventas' }}` al abrir el detalle para que “Volver” regrese al listado.
- **Notificaciones (fase D):** pantalla admin **`/configuracion-notificaciones`**; cron **`POST /cron/recordatorios-citas`** (ver `backend/README.md`).
