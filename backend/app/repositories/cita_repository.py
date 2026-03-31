"""
cita_repository.py

Citas por vínculo propietario–clínica. Vínculo parcial: solo `citas.empresa_id` = clínica actual.
"""

from datetime import datetime
from typing import List

from sqlalchemy import and_, extract, or_
from sqlalchemy.orm import Session

from app.models.cita import Cita
from app.models.mascota import Mascota
from app.models.cliente import Cliente
from app.models.cliente_empresa_vinculo import ClienteEmpresaVinculo

from app.repositories.empresa_mascota_access import join_mascota_accesible_por_empresa
from app.repositories.mascota_repository import obtener_mascota_por_empresa
from app.repositories import vinculo_repository


def crear_cita(db: Session, datos: dict) -> Cita:
    """Crea una nueva cita."""
    cita = Cita(**datos)
    db.add(cita)
    db.commit()
    db.refresh(cita)
    return cita


def base_query_citas_empresa(db: Session, empresa_id: int):
    q_vinculo = (
        db.query(Cita)
        .join(Mascota, Cita.mascota_id == Mascota.id)
        .join(Cliente, Mascota.cliente_id == Cliente.id)
        .join(
            ClienteEmpresaVinculo,
            and_(
                ClienteEmpresaVinculo.cliente_id == Cliente.id,
                ClienteEmpresaVinculo.empresa_id == empresa_id,
                ClienteEmpresaVinculo.estado == vinculo_repository.ESTADO_ACTIVO,
            ),
        )
        .filter(
            or_(
                ClienteEmpresaVinculo.access_level == vinculo_repository.ACCESS_FULL,
                and_(
                    ClienteEmpresaVinculo.access_level == vinculo_repository.ACCESS_PARTIAL,
                    Cita.empresa_id == empresa_id,
                ),
            ),
        )
    )
    q_bloqueos = db.query(Cita).filter(
        Cita.empresa_id == empresa_id,
        Cita.mascota_id.is_(None),
    )
    return q_vinculo.union(q_bloqueos)


def listar_citas_por_mascota(
    db: Session,
    mascota_id: int,
    empresa_id: int,
) -> List[Cita]:
    """Lista citas de una mascota accesibles para la empresa."""
    q = (
        db.query(Cita)
        .join(Mascota, Cita.mascota_id == Mascota.id)
        .filter(Cita.mascota_id == mascota_id)
    )
    q = join_mascota_accesible_por_empresa(q, empresa_id)
    q = _filtro_acceso_cita_por_nivel(q, db, mascota_id, empresa_id)
    return q.order_by(Cita.fecha.desc(), Cita.id.desc()).all()


def _filtro_acceso_cita_por_nivel(q, db: Session, mascota_id: int, empresa_id: int):
    m = obtener_mascota_por_empresa(db, mascota_id, empresa_id, incluir_inactivas=True)
    if not m:
        return q.filter(False)
    v = vinculo_repository.obtener_vinculo_activo(db, m.cliente_id, empresa_id)
    if not v:
        return q.filter(False)
    if v.access_level == vinculo_repository.ACCESS_PARTIAL:
        return q.filter(Cita.empresa_id == empresa_id)
    return q


def count_citas_empresa_en_mes(
    db: Session,
    empresa_id: int,
    year: int,
    month: int,
    exclude_cita_id: int | None = None,
) -> int:
    q = base_query_citas_empresa(db, empresa_id).filter(
        extract("year", Cita.fecha) == year,
        extract("month", Cita.fecha) == month,
        Cita.fecha.isnot(None),
        or_(Cita.estado.is_(None), Cita.estado != "cancelada"),
    )
    if exclude_cita_id is not None:
        q = q.filter(Cita.id != exclude_cita_id)
    return q.count()


def count_citas_por_empresa_y_rango(
    db: Session,
    empresa_id: int,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    estado: str | None = None,
    veterinario_id: int | None = None,
    en_sala_espera: bool | None = None,
) -> int:
    q = base_query_citas_empresa(db, empresa_id)
    if fecha_desde is not None:
        q = q.filter(Cita.fecha >= fecha_desde)
    if fecha_hasta is not None:
        q = q.filter(Cita.fecha <= fecha_hasta)
    if estado is not None and estado.strip():
        q = q.filter(Cita.estado == estado.strip())
    if veterinario_id is not None:
        q = q.filter(Cita.veterinario_id == veterinario_id)
    if en_sala_espera is not None:
        q = q.filter(Cita.en_sala_espera.is_(en_sala_espera))
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
    en_sala_espera: bool | None = None,
) -> List[Cita]:
    offset = (page - 1) * page_size
    q = base_query_citas_empresa(db, empresa_id)
    if fecha_desde is not None:
        q = q.filter(Cita.fecha >= fecha_desde)
    if fecha_hasta is not None:
        q = q.filter(Cita.fecha <= fecha_hasta)
    if estado is not None and estado.strip():
        q = q.filter(Cita.estado == estado.strip())
    if veterinario_id is not None:
        q = q.filter(Cita.veterinario_id == veterinario_id)
    if en_sala_espera is not None:
        q = q.filter(Cita.en_sala_espera.is_(en_sala_espera))
    return q.order_by(Cita.fecha.desc()).offset(offset).limit(page_size).all()


def obtener_cita_por_id_y_empresa(
    db: Session,
    cita_id: int,
    empresa_id: int,
) -> Cita | None:
    c = base_query_citas_empresa(db, empresa_id).filter(Cita.id == cita_id).first()
    if not c:
        return None
    if c.mascota_id is None:
        return c if c.empresa_id == empresa_id else None
    m = obtener_mascota_por_empresa(db, c.mascota_id, empresa_id, incluir_inactivas=True)
    if not m:
        return None
    v = vinculo_repository.obtener_vinculo_activo(db, m.cliente_id, empresa_id)
    if not v:
        return None
    if v.access_level == vinculo_repository.ACCESS_PARTIAL and c.empresa_id != empresa_id:
        return None
    return c


def actualizar_cita(db: Session, cita: Cita, datos: dict) -> Cita:
    """Actualiza campos de una cita existente."""
    for k, v in datos.items():
        if hasattr(cita, k):
            setattr(cita, k, v)
    db.commit()
    db.refresh(cita)
    return cita
