"""Suscripción SaaS del software (planes globales) — vista para admin de clínica."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.empresa_suscripcion_schema import SuscripcionTenantResponse
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.services.empresa_suscripcion_service import obtener_vista_suscripcion_tenant

router = APIRouter(prefix="/empresa/suscripcion", tags=["Empresa — suscripción SaaS"])

_admin = require_roles(1)


@router.get("", response_model=SuscripcionTenantResponse)
def get_mi_suscripcion(
    db: Session = Depends(get_db),
    current_user=Depends(_admin),
):
    """Plan actual de la clínica y catálogo para comparar (solo administrador de empresa)."""
    return obtener_vista_suscripcion_tenant(db, current_user.empresa_id)
