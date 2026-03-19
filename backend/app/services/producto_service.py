from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.movimiento_stock import MovimientoStock
from app.repositories.producto_repository import (
    listar_productos,
    obtener_producto,
    crear_producto as repo_crear,
    actualizar_producto as repo_actualizar,
)


def listar_productos_service(
    db: Session,
    empresa_id: int,
    activo_only: bool = True,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    categoria_id: int | None = None,
):
    return listar_productos(
        db=db,
        empresa_id=empresa_id,
        activo_only=activo_only,
        page=page,
        page_size=page_size,
        search=search,
        categoria_id=categoria_id,
    )


def obtener_producto_service(db: Session, producto_id: int, empresa_id: int):
    p = obtener_producto(db, producto_id, empresa_id)
    if not p:
        raise ApiError(
            code="producto_not_found",
            message="Producto no encontrado",
            status_code=404,
        )
    return p


def crear_producto_service(db: Session, empresa_id: int, datos: dict):
    stock_inicial = datos.get("stock_inicial") or 0
    p = repo_crear(db, empresa_id, datos)
    if stock_inicial > 0:
        mov = MovimientoStock(
            producto_id=p.id,
            tipo="entrada",
            cantidad=stock_inicial,
            observacion="Stock inicial",
        )
        db.add(mov)
        db.commit()
        db.refresh(p)
    return p


def actualizar_producto_service(db: Session, producto_id: int, empresa_id: int, datos: dict):
    stock_ajuste = datos.pop("stock_ajuste", None)
    p = obtener_producto(db, producto_id, empresa_id)
    if not p:
        raise ApiError(
            code="producto_not_found",
            message="Producto no encontrado",
            status_code=404,
        )
    if stock_ajuste is not None and stock_ajuste != 0:
        nuevo_stock = p.stock_actual + stock_ajuste
        if nuevo_stock < 0:
            raise ApiError(
                code="stock_insuficiente",
                message="El ajuste dejaría stock negativo",
                status_code=400,
            )
        p.stock_actual = nuevo_stock
        mov = MovimientoStock(
            producto_id=p.id,
            tipo="ajuste",
            cantidad=stock_ajuste,
            observacion="Ajuste manual",
        )
        db.add(mov)
    for k, v in datos.items():
        if hasattr(p, k):
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p
