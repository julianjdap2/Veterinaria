"""
cita_repository.py

Acceso a datos de la tabla citas. Las consultas se acotan por empresa
mediante el join con mascotas.
"""

from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from app.models.cita import Cita
from app.models.mascota import Mascota


def crear_cita(db: Session, datos: dict) -> Cita:
    """Crea una nueva cita."""
    cita = Cita(**datos)
    db.add(cita)
    db.commit()
    db.refresh(cita)
    return cita


def listar_citas_por_mascota(
    db: Session,
    mascota_id: int,
    empresa_id: int,
) -> List[Cita]:
    """Lista citas de una mascota que pertenece a la empresa."""
    return (
        db.query(Cita)
        .join(Mascota)
        .filter(
            Cita.mascota_id == mascota_id,
            Mascota.empresa_id == empresa_id,
        )
        .order_by(Cita.fecha.desc(), Cita.id.desc())
        .all()
    )


def count_citas_por_empresa_y_rango(
    db: Session,
    empresa_id: int,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    estado: str | None = None,
    veterinario_id: int | None = None,
) -> int:
    """Cuenta citas de la empresa (con filtros opcionales)."""
    q = db.query(Cita).join(Mascota).filter(Mascota.empresa_id == empresa_id)
    if fecha_desde is not None:
        q = q.filter(Cita.fecha >= fecha_desde)
    if fecha_hasta is not None:
        q = q.filter(Cita.fecha <= fecha_hasta)
    if estado is not None and estado.strip():
        q = q.filter(Cita.estado == estado.strip())
    if veterinario_id is not None:
        q = q.filter(Cita.veterinario_id == veterinario_id)
    return q.count()


def listar_citas_por_empresa_y_rango(
    db: Session,
    empresa_id: int,
    fecha_desde: datetime | None,
    fecha_hasta: datetime | None,
    page: int,
    page_size: int,
    estado: str | None = None,
    veterinario_id: int | None = None,
) -> List[Cita]:
    """Lista citas de la empresa en un rango de fechas (paginado)."""
    offset = (page - 1) * page_size
    q = db.query(Cita).join(Mascota).filter(Mascota.empresa_id == empresa_id)
    if fecha_desde is not None:
        q = q.filter(Cita.fecha >= fecha_desde)
    if fecha_hasta is not None:
        q = q.filter(Cita.fecha <= fecha_hasta)
    if estado is not None and estado.strip():
        q = q.filter(Cita.estado == estado.strip())
    if veterinario_id is not None:
        q = q.filter(Cita.veterinario_id == veterinario_id)
    return q.order_by(Cita.fecha.desc()).offset(offset).limit(page_size).all()


def obtener_cita_por_id_y_empresa(
    db: Session,
    cita_id: int,
    empresa_id: int,
) -> Cita | None:
    """Obtiene una cita por id solo si la mascota pertenece a la empresa."""
    return (
        db.query(Cita)
        .join(Mascota)
        .filter(Cita.id == cita_id, Mascota.empresa_id == empresa_id)
        .first()
    )


def actualizar_cita(db: Session, cita: Cita, datos: dict) -> Cita:
    """Actualiza campos de una cita existente."""
    for k, v in datos.items():
        if hasattr(cita, k):
            setattr(cita, k, v)
    db.commit()
    db.refresh(cita)
    return cita
