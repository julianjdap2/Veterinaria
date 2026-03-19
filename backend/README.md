# Backend - Veterinary Management System API

API REST para gestión de veterinarias (multi-tenant por empresa). FastAPI + SQLAlchemy + MySQL.

## Cómo arrancar

```bash
# Desde la raíz del repo
cd backend
venv\Scripts\activate
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Documentación interactiva: **http://127.0.0.1:8000/docs**

## Variables de entorno (.env)

| Variable | Obligatoria | Descripción |
|----------|------------|-------------|
| `DATABASE_URL` | Sí | Ej: `mysql+pymysql://user:pass@host/vet_system` |
| `SECRET_KEY` | Sí | Clave para firmar JWT (no usar "change-me" en producción) |
| `CORS_ORIGINS` | No | Orígenes permitidos separados por coma (default: localhost:3000) |
| `NOTIFICATION_BACKEND` | No | `log`, `smtp` o `queue` (default: log) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` | Si backend=smtp | Configuración de correo |
| `CRON_SECRET` | No | Si lo defines, `POST /cron/*` exige header `X-Cron-Secret` con este valor. |

Al arrancar se valida que existan `SECRET_KEY` y `DATABASE_URL`; si faltan, la aplicación no inicia.

### Cron – Recordatorios de citas

Para enviar recordatorios de citas del día siguiente:

```bash
# Sin protección (CRON_SECRET vacío)
curl -X POST http://localhost:8000/cron/recordatorios-citas

# Con protección
curl -X POST http://localhost:8000/cron/recordatorios-citas -H "X-Cron-Secret: TU_VALOR"
```

Programa esta llamada en el Programador de tareas (Windows) o cron a la hora deseada.

## Endpoints principales

- **GET /** – Comprueba que la API está en marcha.
- **GET /health** – Health check (conectividad con la BD).
- **POST /auth/login** – Login (rate limit 10/min por IP). Body: `{ "email", "password" }`.
- **/usuarios** – CRUD usuarios (solo ADMIN). Creación con body JSON.
- **/clientes** – Listado paginado, creación, detalle por id (ADMIN/RECEPCIÓN creación).
- **/mascotas** – CRUD por empresa con paginación (VETERINARIO/RECEPCIÓN creación).
- **/consultas** – Historial clínico por mascota; creación (VETERINARIO).
- **/citas** – Agenda: listar por mascota o por rango de fechas; crear/actualizar (VETERINARIO/RECEPCIÓN).

Todos los endpoints (salvo `/`, `/health` y `/auth/login`) requieren cabecera `Authorization: Bearer <token>`.

## Tests

```bash
cd backend
venv\Scripts\activate
# Opcional: definir BD de test
set TESTING=1
set DATABASE_URL=mysql+pymysql://root:@127.0.0.1/vet_system
set SECRET_KEY=test-key
python -m pytest tests/ -v
```

- **tests/test_api/** – Integración (health, raíz).
- **tests/test_services/** – Unitarios de servicios (mocks).

## Mejoras implementadas (resumen)

1. **Tests** – Unitarios de servicios (ApiError, reglas de negocio) e integración (health, root).
2. **Clientes** – GET listado paginado y GET por id, acotado por empresa.
3. **Health y config** – `GET /health` y validación de `SECRET_KEY`/`DATABASE_URL` al arranque (pydantic-settings).
4. **Citas** – Módulo completo: modelo, repositorio, servicio, router (crear, listar por mascota/agenda, obtener, actualizar).
5. **Notificaciones** – Backend configurable: `log` (consola), `smtp` (email), `queue` (reservado). Uso en consultas creadas.
6. **Documentación API** – Descripciones en OpenAPI, ejemplos en schemas (login, mascota, cliente).
7. **Rate limiting y CORS** – Límite por IP en login (slowapi); CORS según `CORS_ORIGINS`.

Errores estándar con `request_id`; auditoría por `contextvars`; RBAC por roles (ADMIN=1, VETERINARIO=2, RECEPCIÓN=3).
