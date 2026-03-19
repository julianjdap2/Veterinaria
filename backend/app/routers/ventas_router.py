"""
Ventas de productos (medicamentos/insumos). Solo ADMIN y RECEPCIÓN.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.schemas.venta_schema import VentaCreate, VentaResponse
from app.services.venta_service import (
    crear_venta_service,
    listar_ventas_service,
    obtener_venta_service,
)

router = APIRouter(prefix="/ventas", tags=["Ventas"])

_recep_admin = require_roles(1, 3)


@router.post("", response_model=VentaResponse, status_code=201)
def crear_venta(
    payload: VentaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(_recep_admin),
):
    """Registra una venta con items; descuenta stock y opcionalmente vincula a consulta/cliente."""
    return crear_venta_service(
        db=db,
        empresa_id=current_user.empresa_id,
        usuario_id=current_user.id,
        payload=payload.model_dump(),
    )


class VentasListResponse(BaseModel):
    items: list[VentaResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=VentasListResponse)
def listar_ventas(
    db: Session = Depends(get_db),
    current_user=Depends(_recep_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    consulta_id: int | None = None,
):
    """Lista ventas; opcionalmente filtradas por consulta_id."""
    items, total = listar_ventas_service(
        db=db,
        empresa_id=current_user.empresa_id,
        page=page,
        page_size=page_size,
        consulta_id=consulta_id,
    )
    return VentasListResponse(
        items=[VentaResponse.model_validate(v) for v in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{venta_id}", response_model=VentaResponse)
def obtener_venta(
    venta_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_recep_admin),
):
    return obtener_venta_service(
        db=db,
        venta_id=venta_id,
        empresa_id=current_user.empresa_id,
    )
