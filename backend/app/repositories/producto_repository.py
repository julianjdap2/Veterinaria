from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.producto import Producto


def listar_productos(
    db: Session,
    empresa_id: int,
    activo_only: bool = True,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    categoria_id: int | None = None,
) -> tuple[List[Producto], int]:
    q = db.query(Producto).filter(Producto.empresa_id == empresa_id)
    if activo_only:
        q = q.filter(Producto.activo.is_(True))
    if categoria_id is not None:
        q = q.filter(Producto.categoria_id == categoria_id)
    if search and search.strip():
        t = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Producto.nombre.ilike(t),
                (Producto.tipo or "").ilike(t),
                (Producto.cod_articulo or "").ilike(t),
                (Producto.ean or "").ilike(t),
                (Producto.fabricante or "").ilike(t),
            )
        )
    total = q.count()
    items = q.order_by(Producto.nombre).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def obtener_producto(db: Session, producto_id: int, empresa_id: int) -> Producto | None:
    return (
        db.query(Producto)
        .filter(Producto.id == producto_id, Producto.empresa_id == empresa_id)
        .first()
    )


def crear_producto(db: Session, empresa_id: int, datos: dict) -> Producto:
    datos["empresa_id"] = empresa_id
    datos.setdefault("stock_actual", datos.pop("stock_inicial", 0) or 0)
    datos.setdefault("stock_minimo", datos.get("stock_minimo", 0) or 0)
    p = Producto(**{k: v for k, v in datos.items() if hasattr(Producto, k)})
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def actualizar_producto(db: Session, producto_id: int, empresa_id: int, datos: dict) -> Producto | None:
    p = obtener_producto(db, producto_id, empresa_id)
    if not p:
        return None
    for k, v in datos.items():
        if hasattr(p, k):
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p
