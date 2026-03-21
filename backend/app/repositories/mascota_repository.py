"""
mascota_repository.py

Repositorio encargado de acceder a la base de datos.
Aquí se ejecutan las consultas ORM.
"""

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.models.mascota import Mascota


def crear_mascota(db: Session, datos: dict) -> Mascota:
    nueva_mascota = Mascota(**datos)
    db.add(nueva_mascota)
    db.commit()
    db.refresh(nueva_mascota)
    return nueva_mascota


def count_mascotas_por_empresa(
    db: Session,
    empresa_id: int,
    solo_activas: bool = True,
    cliente_id: int | None = None,
    nombre: str | None = None,
    busqueda: str | None = None,
) -> int:
    """Cuenta mascotas de la empresa (con filtros opcionales)."""
    q = db.query(Mascota).filter(Mascota.empresa_id == empresa_id)
    if solo_activas:
        q = q.filter(Mascota.activo.is_(True))
    if busqueda is not None and busqueda.strip():
        term = f"%{busqueda.strip()}%"
        q = (
            q.join(Cliente, Mascota.cliente_id == Cliente.id)
            .filter(Cliente.empresa_id == empresa_id)
            .filter(
                or_(
                    Mascota.nombre.ilike(term),
                    Cliente.nombre.ilike(term),
                    Cliente.documento.ilike(term),
                )
            )
        )
    else:
        if cliente_id is not None:
            q = q.filter(Mascota.cliente_id == cliente_id)
        if nombre is not None and nombre.strip():
            q = q.filter(Mascota.nombre.ilike(f"%{nombre.strip()}%"))
    return q.count()


def listar_mascotas_por_empresa(
    db: Session,
    empresa_id: int,
    page: int,
    page_size: int,
    solo_activas: bool = True,
    cliente_id: int | None = None,
    nombre: str | None = None,
    busqueda: str | None = None,
) -> list[Mascota]:
    offset = (page - 1) * page_size
    q = db.query(Mascota).filter(Mascota.empresa_id == empresa_id)
    if solo_activas:
        q = q.filter(Mascota.activo.is_(True))
    if busqueda is not None and busqueda.strip():
        term = f"%{busqueda.strip()}%"
        q = (
            q.join(Cliente, Mascota.cliente_id == Cliente.id)
            .filter(Cliente.empresa_id == empresa_id)
            .filter(
                or_(
                    Mascota.nombre.ilike(term),
                    Cliente.nombre.ilike(term),
                    Cliente.documento.ilike(term),
                )
            )
        )
    else:
        if cliente_id is not None:
            q = q.filter(Mascota.cliente_id == cliente_id)
        if nombre is not None and nombre.strip():
            q = q.filter(Mascota.nombre.ilike(f"%{nombre.strip()}%"))
    return q.order_by(Mascota.id.desc()).offset(offset).limit(page_size).all()


def obtener_mascota_por_empresa(
    db: Session,
    mascota_id: int,
    empresa_id: int,
    incluir_inactivas: bool = False,
) -> Mascota | None:
    q = db.query(Mascota).filter(
        Mascota.id == mascota_id,
        Mascota.empresa_id == empresa_id,
    )
    if not incluir_inactivas:
        q = q.filter(Mascota.activo.is_(True))
    return q.first()


def eliminar_mascota_por_empresa(
    db: Session,
    mascota_id: int,
    empresa_id: int,
) -> Mascota | None:
    """Soft delete: marca activo=False en lugar de borrar el registro."""
    mascota = obtener_mascota_por_empresa(db, mascota_id, empresa_id, incluir_inactivas=True)
    if mascota:
        mascota.activo = False
        db.commit()
        db.refresh(mascota)
    return mascota


def actualizar_activo_mascota_por_empresa(
    db: Session,
    mascota_id: int,
    empresa_id: int,
    activo: bool,
) -> Mascota | None:
    """Actualiza el campo activo de la mascota (reactivar o desactivar)."""
    mascota = obtener_mascota_por_empresa(db, mascota_id, empresa_id, incluir_inactivas=True)
    if not mascota:
        return None
    mascota.activo = activo
    db.commit()
    db.refresh(mascota)
    return mascota