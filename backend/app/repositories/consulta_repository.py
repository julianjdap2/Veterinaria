"""
consulta_repository.py

Historial clínico por vínculo propietario–clínica.
Vínculo parcial: solo consultas con `consultas.empresa_id` = clínica actual.
"""

from typing import List

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.models.consulta import Consulta
from app.models.mascota import Mascota
from app.models.cliente import Cliente
from app.models.cliente_empresa_vinculo import ClienteEmpresaVinculo

from app.repositories.empresa_mascota_access import join_mascota_accesible_por_empresa
from app.repositories.mascota_repository import obtener_mascota_por_empresa
from app.repositories import vinculo_repository


def base_query_consultas_empresa(db: Session, empresa_id: int):
    """Consultas visibles: vínculo completo (toda la mascota) o parcial solo si se registraron en esta clínica."""
    return (
        db.query(Consulta)
        .join(Mascota, Consulta.mascota_id == Mascota.id)
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
                    Consulta.empresa_id == empresa_id,
                ),
            ),
        )
    )


def crear_consulta(db: Session, datos: dict) -> Consulta:
    consulta = Consulta(**datos)
    db.add(consulta)
    db.commit()
    db.refresh(consulta)
    return consulta


def actualizar_consulta_campos(db: Session, consulta: Consulta, campos: dict) -> Consulta:
    for key, value in campos.items():
        setattr(consulta, key, value)
    db.commit()
    db.refresh(consulta)
    return consulta


def _filtro_acceso_consulta_por_nivel(q, db: Session, mascota_id: int, empresa_id: int):
    m = obtener_mascota_por_empresa(db, mascota_id, empresa_id, incluir_inactivas=True)
    if not m:
        return q.filter(False)
    v = vinculo_repository.obtener_vinculo_activo(db, m.cliente_id, empresa_id)
    if not v:
        return q.filter(False)
    if v.access_level == vinculo_repository.ACCESS_PARTIAL:
        return q.filter(Consulta.empresa_id == empresa_id)
    return q


def listar_consultas_por_mascota(
    db: Session,
    mascota_id: int,
    empresa_id: int,
) -> List[Consulta]:
    q = (
        db.query(Consulta)
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .filter(Consulta.mascota_id == mascota_id)
    )
    q = join_mascota_accesible_por_empresa(q, empresa_id)
    q = _filtro_acceso_consulta_por_nivel(q, db, mascota_id, empresa_id)
    return q.order_by(Consulta.created_at.desc()).all()


def obtener_consulta_por_id(
    db: Session,
    consulta_id: int,
    empresa_id: int,
) -> Consulta | None:
    q = (
        db.query(Consulta)
        .options(
            joinedload(Consulta.mascota),
            joinedload(Consulta.cita),
        )
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .filter(Consulta.id == consulta_id)
    )
    q = join_mascota_accesible_por_empresa(q, empresa_id)
    c = q.first()
    if not c or not c.mascota:
        return None
    v = vinculo_repository.obtener_vinculo_activo(db, c.mascota.cliente_id, empresa_id)
    if not v:
        return None
    if v.access_level == vinculo_repository.ACCESS_PARTIAL:
        if c.empresa_id != empresa_id:
            return None
    return c


def listar_consultas_por_cliente(
    db: Session,
    cliente_id: int,
    empresa_id: int,
) -> List[Consulta]:
    """Consultas de mascotas del cliente accesibles según vínculo y nivel."""
    v = vinculo_repository.obtener_vinculo_activo(db, cliente_id, empresa_id)
    if not v:
        return []
    q = (
        db.query(Consulta)
        .options(joinedload(Consulta.mascota))
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .join(Cliente, Mascota.cliente_id == Cliente.id)
        .join(
            ClienteEmpresaVinculo,
            and_(
                ClienteEmpresaVinculo.cliente_id == Cliente.id,
                ClienteEmpresaVinculo.empresa_id == empresa_id,
                ClienteEmpresaVinculo.estado == vinculo_repository.ESTADO_ACTIVO,
            ),
        )
        .filter(Cliente.id == cliente_id)
    )
    if v.access_level == vinculo_repository.ACCESS_PARTIAL:
        q = q.filter(Consulta.empresa_id == empresa_id)
    return q.order_by(Consulta.created_at.desc()).all()
