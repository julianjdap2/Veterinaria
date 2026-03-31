"""
main.py

Punto de entrada del backend. Configura FastAPI, middlewares,
manejo global de errores, health check y validación de configuración al arranque.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.middleware.audit_middleware import AuditMiddleware
from app.middleware.request_id_middleware import RequestIdMiddleware
from app.database.database import engine, Base
from app.config import get_settings

# Importar modelos para que SQLAlchemy registre los mapeos
from app.models import (  # noqa: F401
    Rol,
    Usuario,
    Cliente,
    ClienteEmpresaVinculo,
    ClienteVinculoInvitacion,
    PlanAfiliacion,
    PlanAfiliacionUso,
    PlanSalud,
    PlanSaludCobertura,
    Mascota,
    Consulta,
    Cita,
    Especie,
    Raza,
    CategoriaProducto,
    Producto,
    Venta,
    VentaItem,
    MovimientoStock,
)

from app.controllers.auth_controller import router as auth_router
from app.routers import usuarios_router
from app.routers import clientes_router
from app.routers import mascotas_router
from app.routers import consultas_router
from app.routers import citas_router
from app.routers import catalogo_router
from app.routers import productos_router
from app.routers import ventas_router
from app.routers import audit_router
from app.routers import cron_router
from app.routers import dashboard_router
from app.routers import superadmin_router
from app.routers import empresa_operacion_router
from app.routers import empresa_notificaciones_router
from app.routers import plan_salud_router
from app.routers import empresa_suscripcion_router
from app.routers import variables_clinicas_router
from app.routers import public_router
from app.utils.audit_events import register_model_events
from app.core.exception_handlers import (
    api_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.errors import ApiError
from app.core.health import check_database
from app.core.rate_limit import limiter

# Crear tablas en la base de datos
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Valida configuración al arranque y configura logging."""
    from app.core.logging_config import setup_logging
    setup_logging()
    get_settings().validate_production()
    yield


app = FastAPI(
    title="Veterinary Management System API",
    lifespan=lifespan,
    description="""
API REST para gestión de veterinarias (multi-tenant por empresa).

## Módulos principales
- **Auth**: login y JWT.
- **Usuarios**: CRUD por empresa.
- **Clientes**: dueños de mascotas (listado paginado, creación).
- **Mascotas**: CRUD por empresa con paginación.
- **Consultas**: historial clínico por mascota.
- **Citas**: agenda por empresa y por mascota.
- **Catálogo**: especies, razas y auxiliares.
- **Productos**: inventario y catálogo por empresa.
- **Ventas**: POS y listados.
- **Dashboard**: métricas del panel.
- **Auditoría**: registros por empresa (roles autorizados).
- **Empresa**: configuración operativa y notificaciones por tenant.
- **Superadmin**: empresas y planes (rol SUPERADMIN).
- **Público**: datos mínimos para marketing (`GET /public/clinicas`).

## Seguridad
- Autenticación JWT en todos los endpoints excepto `/auth/login`, `/health` y `/`.
- Roles: ADMIN (1), VETERINARIO (2), RECEPCIÓN (3), SUPERADMIN (4).
- Respuestas de error estandarizadas con `request_id` para trazabilidad.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

register_model_events(Base)

# Middlewares (orden: el último añadido es el primero en ejecutarse)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(AuditMiddleware)

# CORS: orígenes permitidos desde configuración (CORS_ORIGINS en .env)
from starlette.middleware.cors import CORSMiddleware

_settings = get_settings()
_origins = [o.strip() for o in _settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Handlers globales de errores (formato estandarizado)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(ApiError, api_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Routers HTTP (capa de presentación)
app.include_router(public_router.router)
app.include_router(auth_router)
app.include_router(usuarios_router.router)
app.include_router(clientes_router.router)
app.include_router(mascotas_router.router)
app.include_router(consultas_router.router)
app.include_router(citas_router.router)
app.include_router(catalogo_router.router)
app.include_router(productos_router.router)
app.include_router(ventas_router.router)
app.include_router(audit_router.router)
app.include_router(cron_router.router)
app.include_router(dashboard_router.router)
app.include_router(superadmin_router.router)
app.include_router(empresa_operacion_router.router)
app.include_router(empresa_notificaciones_router.router)
app.include_router(plan_salud_router.router)
app.include_router(empresa_suscripcion_router.router)
app.include_router(variables_clinicas_router.router)


@app.get(
    "/",
    summary="Raíz",
    description="Comprueba que la API está en marcha.",
)
def root():
    return {"message": "Veterinary System API funcionando correctamente"}


@app.get(
    "/health",
    summary="Health check",
    description="Comprueba conectividad con la base de datos. Útil para balanceadores y monitoreo.",
)
def health():
    db_ok, db_msg = check_database()
    status = "ok" if db_ok else "degraded"
    return {
        "status": status,
        "database": db_msg,
    }
