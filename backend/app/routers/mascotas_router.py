"""
mascotas_router.py

Endpoints del módulo Mascotas.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.database.database import get_db
from app.security.usuario_operativo import require_mascotas_read_user, require_mascotas_write_user
from app.schemas.mascota_schema import MascotaCreate, MascotaResponse, MascotaUpdate
from app.schemas.common_schema import PaginatedResponse
from app.services.mascota_service import (
    crear_mascota,
    listar_mascotas_por_empresa,
    obtener_mascota_por_empresa,
    actualizar_activo_mascota_service,
    actualizar_mascota_datos_service,
    eliminar_mascota_por_empresa,
    mascotas_a_response_con_cliente_nombre,
    mascota_a_response_con_cliente_nombre,
)

router = APIRouter(prefix="/mascotas", tags=["Mascotas"])


@router.post("/", response_model=MascotaResponse)
def crear_mascota_endpoint(
    mascota: MascotaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_mascotas_write_user),
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
    current_user=Depends(require_mascotas_read_user),
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
    current_user=Depends(require_mascotas_read_user),
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
    current_user=Depends(require_mascotas_write_user),
):
    """PATCH parcial: nombre, especie, raza, peso, activo, etc."""
    data = payload.model_dump(exclude_unset=True)
    if not data:
        m = obtener_mascota_por_empresa(
            db=db,
            mascota_id=mascota_id,
            empresa_id=current_user.empresa_id,
            incluir_inactivas=True,
        )
        if not m:
            raise ApiError(
                code="mascota_not_found",
                message="Mascota no encontrada",
                status_code=404,
            )
        return mascota_a_response_con_cliente_nombre(db, m)
    if set(data.keys()) == {"activo"}:
        m = actualizar_activo_mascota_service(
            db=db,
            mascota_id=mascota_id,
            empresa_id=current_user.empresa_id,
            activo=data["activo"],
        )
        return mascota_a_response_con_cliente_nombre(db, m)
    m = actualizar_mascota_datos_service(
        db=db,
        mascota_id=mascota_id,
        empresa_id=current_user.empresa_id,
        campos=data,
    )
    return mascota_a_response_con_cliente_nombre(db, m)


@router.delete("/{mascota_id}", response_model=MascotaResponse)
def eliminar_mascota(
    mascota_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_mascotas_write_user),
):
    m = eliminar_mascota_por_empresa(
        db=db,
        mascota_id=mascota_id,
        empresa_id=current_user.empresa_id,
    )
    return mascota_a_response_con_cliente_nombre(db, m)