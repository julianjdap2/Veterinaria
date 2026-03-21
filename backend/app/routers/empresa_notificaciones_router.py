"""
Configuración de recordatorios y plantillas (admin clínica).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.security.admin_permissions import require_admin_permission
from app.schemas.notificaciones_config_schema import (
    NotificacionesConfigResponse,
    NotificacionesConfigUpdate,
)
from app.services.notificaciones_config_service import (
    obtener_notificaciones_config_service,
    actualizar_notificaciones_config_service,
)

router = APIRouter(prefix="/empresa/config-notificaciones", tags=["Notificaciones"])

_tenant = require_roles(1, 2, 3)


@router.get("", response_model=NotificacionesConfigResponse)
def get_config_notificaciones(
    db: Session = Depends(get_db),
    current_user=Depends(_tenant),
):
    """Variables en plantillas: {nombre_mascota}, {fecha}, {clinica}, {cliente}."""
    return obtener_notificaciones_config_service(db, current_user.empresa_id)


@router.patch("", response_model=NotificacionesConfigResponse)
def patch_config_notificaciones(
    payload: NotificacionesConfigUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
    _perm=Depends(require_admin_permission("admin_configuracion_empresa")),
):
    return actualizar_notificaciones_config_service(db, current_user.empresa_id, payload)
