from typing import List
from sqlalchemy.orm import Session

from app.models.categoria_producto import CategoriaProducto


def listar_categorias(db: Session, empresa_id: int) -> List[CategoriaProducto]:
    return (
        db.query(CategoriaProducto)
        .filter(CategoriaProducto.empresa_id == empresa_id)
        .order_by(CategoriaProducto.nombre)
        .all()
    )


def crear_categoria(db: Session, empresa_id: int, nombre: str) -> CategoriaProducto:
    c = CategoriaProducto(empresa_id=empresa_id, nombre=nombre)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def obtener_categoria_por_nombre(
    db: Session, empresa_id: int, nombre: str
) -> CategoriaProducto | None:
    if not (nombre and nombre.strip()):
        return None
    return (
        db.query(CategoriaProducto)
        .filter(
            CategoriaProducto.empresa_id == empresa_id,
            CategoriaProducto.nombre == nombre.strip(),
        )
        .first()
    )
