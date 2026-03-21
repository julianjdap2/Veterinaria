"""
mascotas_router.py

Endpoints del módulo Mascotas.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.schemas.mascota_schema import MascotaCreate, MascotaResponse, MascotaUpdate
from app.schemas.common_schema import PaginatedResponse
from app.services.mascota_service import (
    crear_mascota,
    listar_mascotas_por_empresa,
    obtener_mascota_por_empresa,
    actualizar_activo_mascota_service,
    eliminar_mascota_por_empresa,
    mascotas_a_response_con_cliente_nombre,
    mascota_a_response_con_cliente_nombre,
)

router = APIRouter(prefix="/mascotas", tags=["Mascotas"])


@router.post("/", response_model=MascotaResponse)
def crear_mascota_endpoint(
    mascota: MascotaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 2, 3)),  # ADMIN, VETERINARIO, RECEPCION
):
    data = mascota.model_dump()  # Pydantic v2
    data["empresa_id"] = current_user.empresa_id
    m = crear_mascota(db, data)
    return mascota_a_response_con_cliente_nombre(db, m)


@router.get("/", response_model=PaginatedResponse[MascotaResponse])
def listar_mascotas(
    page: int = 1,
    page_size: int = 20,
    cliente_id: int | None = None,
    nombre: str | None = None,
    busqueda: str | None = None,
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Si `busqueda` tiene valor, filtra por nombre de mascota, nombre de cliente o documento (OR)."""
    items, total = listar_mascotas_por_empresa(
        db=db,
        empresa_id=current_user.empresa_id,
        page=page,
        page_size=page_size,
        solo_activas=not incluir_inactivos,
        cliente_id=cliente_id,
        nombre=nombre,
        busqueda=busqueda,
    )
    out = mascotas_a_response_con_cliente_nombre(db, items)
    return PaginatedResponse(items=out, total=total, page=page, page_size=page_size)


@router.get("/{mascota_id}", response_model=MascotaResponse)
def obtener_mascota(
    mascota_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    m = obtener_mascota_por_empresa(
        db=db,
        mascota_id=mascota_id,
        empresa_id=current_user.empresa_id,
    )
    return mascota_a_response_con_cliente_nombre(db, m)


@router.patch("/{mascota_id}", response_model=MascotaResponse)
def actualizar_mascota(
    mascota_id: int,
    payload: MascotaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 2, 3)),  # ADMIN, VETERINARIO, RECEPCION
):
    """Permite reactivar (activo=true) o desactivar (activo=false) la mascota."""
    if payload.activo is None:
        m = obtener_mascota_por_empresa(
            db=db,
            mascota_id=mascota_id,
            empresa_id=current_user.empresa_id,
        )
        return mascota_a_response_con_cliente_nombre(db, m)
    m = actualizar_activo_mascota_service(
        db=db,
        mascota_id=mascota_id,
        empresa_id=current_user.empresa_id,
        activo=payload.activo,
    )
    return mascota_a_response_con_cliente_nombre(db, m)


@router.delete("/{mascota_id}", response_model=MascotaResponse)
def eliminar_mascota(
    mascota_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    m = eliminar_mascota_por_empresa(
        db=db,
        mascota_id=mascota_id,
        empresa_id=current_user.empresa_id,
    )
    return mascota_a_response_con_cliente_nombre(db, m)