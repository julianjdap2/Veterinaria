"""
cliente_repository.py

Listados y acceso por clínica usan la tabla de vínculos `cliente_empresa_vinculos`
(propietario global ↔ empresa). El campo `clientes.empresa_id` puede seguir existiendo
como referencia de alta, pero el permiso efectivo es el del vínculo.
"""

from datetime import datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.models.cliente_empresa_vinculo import ClienteEmpresaVinculo
from app.models.mascota import Mascota

from app.repositories.empresa_mascota_access import join_mascota_accesible_por_empresa
from app.repositories.vinculo_repository import ESTADO_ACTIVO


def obtener_cliente_por_documento_normalizado(db: Session, documento: str) -> Cliente | None:
    d = (documento or "").strip()
    if len(d) < 3:
        return None
    return db.query(Cliente).filter(Cliente.documento == d).first()


def crear_cliente(db: Session, cliente: dict) -> Cliente:
    """Crea un nuevo cliente y lo persiste."""
    nuevo_cliente = Cliente(**cliente)
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)
    return nuevo_cliente


def obtener_cliente(db: Session, cliente_id: int) -> Cliente | None:
    """Obtiene un cliente por id (sin filtro de empresa; usar en contexto controlado)."""
    return db.query(Cliente).filter(Cliente.id == cliente_id).first()


def listar_clientes_por_empresa(
    db: Session,
    empresa_id: int,
    page: int,
    page_size: int,
    solo_activos: bool = True,
    nombre: str | None = None,
    documento: str | None = None,
    busqueda: str | None = None,
) -> list[tuple[Cliente, int, datetime | None]]:
    """Lista clientes con conteo de mascotas en la clínica y fecha de autorización del vínculo."""
    offset = (page - 1) * page_size
    # Mismo criterio que listar_mascotas: vínculo propietario–clínica (no solo mascota.empresa_id).
    mc = (
        join_mascota_accesible_por_empresa(db.query(Mascota), empresa_id)
        .filter(Mascota.activo.is_(True))
        .with_entities(Mascota.cliente_id, func.count(Mascota.id).label("n"))
        .group_by(Mascota.cliente_id)
        .subquery()
    )
    q = (
        db.query(
            Cliente,
            func.coalesce(mc.c.n, 0).label("mascotas_count"),
            ClienteEmpresaVinculo.validated_at,
        )
        .join(
            ClienteEmpresaVinculo,
            (ClienteEmpresaVinculo.cliente_id == Cliente.id)
            & (ClienteEmpresaVinculo.empresa_id == empresa_id)
            & (ClienteEmpresaVinculo.estado == ESTADO_ACTIVO),
        )
        .outerjoin(mc, mc.c.cliente_id == Cliente.id)
    )
    if solo_activos:
        q = q.filter(Cliente.activo.is_(True))
    if busqueda is not None and busqueda.strip():
        term = f"%{busqueda.strip()}%"
        q = q.filter(
            or_(
                Cliente.nombre.ilike(term),
                Cliente.documento.ilike(term),
            )
        )
    else:
        if nombre is not None and nombre.strip():
            q = q.filter(Cliente.nombre.ilike(f"%{nombre.strip()}%"))
        if documento is not None and documento.strip():
            q = q.filter(Cliente.documento.ilike(f"%{documento.strip()}%"))
    rows = q.order_by(Cliente.id.desc()).offset(offset).limit(page_size).all()
    return [(c, int(mc_val or 0), val_at) for c, mc_val, val_at in rows]


def obtener_cliente_por_empresa(
    db: Session,
    cliente_id: int,
    empresa_id: int,
    incluir_inactivos: bool = False,
) -> Cliente | None:
    """Obtiene un cliente por id solo si pertenece a la empresa."""
    q = (
        db.query(Cliente)
        .join(ClienteEmpresaVinculo)
        .filter(
            Cliente.id == cliente_id,
            ClienteEmpresaVinculo.empresa_id == empresa_id,
            ClienteEmpresaVinculo.estado == ESTADO_ACTIVO,
        )
    )
    if not incluir_inactivos:
        q = q.filter(Cliente.activo.is_(True))
    return q.first()


def desactivar_cliente_por_empresa(
    db: Session,
    cliente_id: int,
    empresa_id: int,
) -> Cliente | None:
    """Soft delete: marca activo=False en lugar de borrar el registro."""
    cliente = obtener_cliente_por_empresa(db, cliente_id, empresa_id, incluir_inactivos=True)
    if cliente:
        cliente.activo = False
        db.commit()
        db.refresh(cliente)
    return cliente


def actualizar_activo_cliente_por_empresa(
    db: Session,
    cliente_id: int,
    empresa_id: int,
    activo: bool,
) -> Cliente | None:
    """Actualiza el campo activo del cliente (reactivar o desactivar)."""
    cliente = obtener_cliente_por_empresa(db, cliente_id, empresa_id, incluir_inactivos=True)
    if not cliente:
        return None
    cliente.activo = activo
    db.commit()
    db.refresh(cliente)
    return cliente


def actualizar_cliente_por_empresa(
    db: Session,
    cliente_id: int,
    empresa_id: int,
    data: dict,
) -> Cliente | None:
    """Actualiza solo los campos presentes en data (no None)."""
    cliente = obtener_cliente_por_empresa(db, cliente_id, empresa_id, incluir_inactivos=True)
    if not cliente:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(cliente, key, value)
    db.commit()
    db.refresh(cliente)
    return cliente


def count_clientes_por_empresa(
    db: Session,
    empresa_id: int,
    solo_activos: bool = True,
    nombre: str | None = None,
    documento: str | None = None,
    busqueda: str | None = None,
) -> int:
    """Cuenta clientes de la empresa (para paginación con total)."""
    q = (
        db.query(Cliente)
        .join(ClienteEmpresaVinculo)
        .filter(
            ClienteEmpresaVinculo.empresa_id == empresa_id,
            ClienteEmpresaVinculo.estado == ESTADO_ACTIVO,
        )
    )
    if solo_activos:
        q = q.filter(Cliente.activo.is_(True))
    if busqueda is not None and busqueda.strip():
        term = f"%{busqueda.strip()}%"
        q = q.filter(
            or_(
                Cliente.nombre.ilike(term),
                Cliente.documento.ilike(term),
            ),
        )
    else:
        if nombre is not None and nombre.strip():
            q = q.filter(Cliente.nombre.ilike(f"%{nombre.strip()}%"))
        if documento is not None and documento.strip():
            q = q.filter(Cliente.documento.ilike(f"%{documento.strip()}%"))
    return q.count()