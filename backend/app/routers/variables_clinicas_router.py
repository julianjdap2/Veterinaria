"""
Catálogos de variables clínicas por empresa (vacunas, hospitalización, laboratorio, etc.).

Lectura: roles de la empresa (admin, veterinario, recepción).
Escritura: solo administrador con permiso `admin_configuracion_empresa`.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.security.admin_permissions import require_admin_permission
from app.schemas.variables_clinicas_schema import (
    TopVariableUsoItem,
    VariablesClinicasResponse,
    VariablesClinicasUpdate,
)
from app.services.variables_clinicas_service import (
    actualizar_variables_clinicas_service,
    obtener_variables_clinicas_service,
    top_pruebas_laboratorio_mas_usadas_service,
)

router = APIRouter(prefix="/empresa/variables-clinicas", tags=["Variables clínicas"])

_tenant_read = require_roles(1, 2, 3)


@router.get("", response_model=VariablesClinicasResponse)
def get_variables_clinicas(
    db: Session = Depends(get_db),
    current_user=Depends(_tenant_read),
):
    return obtener_variables_clinicas_service(db, current_user.empresa_id)


@router.patch("", response_model=VariablesClinicasResponse)
def patch_variables_clinicas(
    payload: VariablesClinicasUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
    _perm=Depends(require_admin_permission("admin_configuracion_empresa")),
):
    return actualizar_variables_clinicas_service(db, current_user.empresa_id, payload)


@router.get("/pruebas-laboratorio/mas-usadas", response_model=list[TopVariableUsoItem])
def get_pruebas_laboratorio_mas_usadas(
    dias: int = Query(default=90, ge=1, le=365),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user=Depends(_tenant_read),
):
    return top_pruebas_laboratorio_mas_usadas_service(
        db=db,
        empresa_id=current_user.empresa_id,
        dias=dias,
        limit=limit,
    )
