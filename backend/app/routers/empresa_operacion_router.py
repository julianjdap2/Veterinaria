"""
Parámetros operativos de la empresa actual (tipos de servicio en agenda, formato consecutivo ventas).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.security.admin_permissions import require_admin_permission
from app.schemas.empresa_operacion_schema import ConfigOperativaResponse, ConfigOperativaUpdate
from app.services.empresa_operacion_service import (
    obtener_config_operativa_service,
    actualizar_config_operativa_service,
)

router = APIRouter(prefix="/empresa/config-operativa", tags=["Configuración operativa"])

_tenant_users = require_roles(1, 2, 3)


@router.get("", response_model=ConfigOperativaResponse)
def get_config_operativa(
    db: Session = Depends(get_db),
    current_user=Depends(_tenant_users),
):
    """Tipos de servicio para citas y parámetros de numeración de ventas (lectura)."""
    return obtener_config_operativa_service(db, current_user.empresa_id)


@router.patch("", response_model=ConfigOperativaResponse)
def patch_config_operativa(
    payload: ConfigOperativaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
    _perm=Depends(require_admin_permission("admin_configuracion_empresa")),
):
    """Solo admin empresa con permiso de configuración."""
    return actualizar_config_operativa_service(db, current_user.empresa_id, payload)
