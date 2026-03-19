"""
consulta_repository.py

Acceso a datos de la tabla consultas (historial clínico).
Todas las lecturas se acotan por empresa vía join con mascotas.
"""

from typing import List

from sqlalchemy.orm import Session, joinedload

from app.models.consulta import Consulta
from app.models.mascota import Mascota


def crear_consulta(db: Session, datos: dict) -> Consulta:
    consulta = Consulta(**datos)
    db.add(consulta)
    db.commit()
    db.refresh(consulta)
    return consulta


def listar_consultas_por_mascota(
    db: Session,
    mascota_id: int,
    empresa_id: int,
) -> List[Consulta]:
    return (
        db.query(Consulta)
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .filter(Consulta.mascota_id == mascota_id, Mascota.empresa_id == empresa_id)
        .order_by(Consulta.created_at.desc())
        .all()
    )


def obtener_consulta_por_id(
    db: Session,
    consulta_id: int,
    empresa_id: int,
) -> Consulta | None:
    return (
        db.query(Consulta)
        .options(joinedload(Consulta.mascota))
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .filter(Consulta.id == consulta_id, Mascota.empresa_id == empresa_id)
        .first()
    )


def listar_consultas_por_cliente(
    db: Session,
    cliente_id: int,
    empresa_id: int,
) -> List[Consulta]:
    """Consultas de mascotas que pertenecen al cliente (para elegir fórmula al registrar venta)."""
    return (
        db.query(Consulta)
        .options(joinedload(Consulta.mascota))
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .filter(Mascota.cliente_id == cliente_id, Mascota.empresa_id == empresa_id)
        .order_by(Consulta.created_at.desc())
        .all()
    )

