"""
citas_router.py

Endpoints para gestión de citas/agenda. Todas las operaciones
están acotadas por la empresa del usuario autenticado.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.schemas.cita_schema import CitaCreate, CitaResponse, CitaUpdate
from app.schemas.common_schema import PaginatedResponse
from app.schemas.formula_schema import FormulaItemCreate, FormulaItemResponse
from app.repositories.formula_repository import (
    listar_por_cita,
    crear_item_cita,
    eliminar_item_cita,
)
from app.services.cita_service import (
    crear_cita_service,
    listar_citas_mascota_service,
    listar_citas_agenda_service,
    obtener_cita_service,
    actualizar_cita_service,
)

router = APIRouter(prefix="/citas", tags=["Citas"])


@router.post(
    "/",
    response_model=CitaResponse,
    summary="Crear cita",
    description="Registra una nueva cita para una mascota. Solo RECEPCIÓN y VETERINARIO.",
)
def crear_cita(
    payload: CitaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 2, 3)),  # ADMIN, VETERINARIO, RECEPCION
):
    """Crea una cita asociada a una mascota de la empresa."""
    return crear_cita_service(db, payload.model_dump(), current_user.empresa_id)


@router.get(
    "/mascota/{mascota_id}",
    response_model=list[CitaResponse],
    summary="Historial de citas de una mascota",
)
def listar_citas_por_mascota(
    mascota_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lista todas las citas de una mascota de la empresa."""
    return listar_citas_mascota_service(db, mascota_id, current_user.empresa_id)


@router.get(
    "/agenda",
    response_model=PaginatedResponse[CitaResponse],
    summary="Listar citas (agenda)",
    description="Lista citas de la empresa. Filtros: fecha_desde, fecha_hasta, estado, veterinario_id (para 'Mis citas').",
)
def listar_agenda(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    estado: Optional[str] = None,
    veterinario_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Devuelve citas con items, total, page y page_size."""
    items, total = listar_citas_agenda_service(
        db=db,
        empresa_id=current_user.empresa_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        page=page,
        page_size=page_size,
        estado=estado,
        veterinario_id=veterinario_id,
    )
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


_formula_cita_escribir = require_roles(1, 2)  # admin, vet: seleccionar medicamentos a recetar en la cita


@router.get("/{cita_id}/formula", response_model=list[FormulaItemResponse])
def listar_formula_cita_endpoint(
    cita_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lista los medicamentos a recetar (prescripción) de la cita."""
    items = listar_por_cita(db, cita_id, current_user.empresa_id)
    out = []
    for it in items:
        data = FormulaItemResponse.model_validate(it)
        if hasattr(it, "producto") and it.producto:
            data.producto_nombre = it.producto.nombre
        else:
            data.producto_nombre = None
        out.append(data)
    return out


@router.post("/{cita_id}/formula", response_model=FormulaItemResponse, status_code=201)
def agregar_item_formula_cita(
    cita_id: int,
    payload: FormulaItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(_formula_cita_escribir),
):
    """Añade un medicamento a recetar en la cita (veterinario)."""
    item = crear_item_cita(
        db=db,
        cita_id=cita_id,
        empresa_id=current_user.empresa_id,
        datos=payload.model_dump(),
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    resp = FormulaItemResponse.model_validate(item)
    if item.producto:
        resp.producto_nombre = item.producto.nombre
    return resp


@router.delete("/{cita_id}/formula/{item_id}", status_code=204)
def quitar_item_formula_cita(
    cita_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_formula_cita_escribir),
):
    """Quita un medicamento de la prescripción de la cita."""
    ok = eliminar_item_cita(db, item_id, current_user.empresa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    return None


@router.get(
    "/{cita_id}",
    response_model=CitaResponse,
    summary="Obtener cita por ID",
)
def obtener_cita(
    cita_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Obtiene el detalle de una cita (solo si pertenece a la empresa)."""
    return obtener_cita_service(db, cita_id, current_user.empresa_id)


@router.patch(
    "/{cita_id}",
    response_model=CitaResponse,
    summary="Actualizar cita",
    description="Actualiza estado, fecha o motivo de una cita.",
)
def actualizar_cita(
    cita_id: int,
    payload: CitaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 2, 3)),  # ADMIN, VETERINARIO, RECEPCION
):
    """Actualiza una cita. Solo campos enviados son modificados."""
    datos = payload.model_dump(exclude_unset=True)
    return actualizar_cita_service(db, cita_id, current_user.empresa_id, datos, current_user)
