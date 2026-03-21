"""
cliente_repository.py

Acceso a datos de la tabla clientes. Todas las lecturas deben filtrar por
empresa_id para mantener aislamiento multi-tenant.
"""

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.cliente import Cliente


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
) -> list[Cliente]:
    """Lista clientes de una empresa con paginación y filtros opcionales."""
    offset = (page - 1) * page_size
    q = db.query(Cliente).filter(Cliente.empresa_id == empresa_id)
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
    return q.order_by(Cliente.id.desc()).offset(offset).limit(page_size).all()


def obtener_cliente_por_empresa(
    db: Session,
    cliente_id: int,
    empresa_id: int,
    incluir_inactivos: bool = False,
) -> Cliente | None:
    """Obtiene un cliente por id solo si pertenece a la empresa."""
    q = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.empresa_id == empresa_id,
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
    q = db.query(Cliente).filter(Cliente.empresa_id == empresa_id)
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
    return q.count()