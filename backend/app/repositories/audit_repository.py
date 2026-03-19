"""
audit_repository.py

Acceso a audit_logs. Creación manual y consulta con filtros (solo ADMIN).
"""

from datetime import datetime
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def listar_audit_logs(
    db: Session,
    tabla: str | None = None,
    usuario_id: int | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list, int]:
    """Lista logs con filtros; devuelve (items, total)."""
    q = db.query(AuditLog)
    if tabla:
        q = q.filter(AuditLog.tabla_afectada == tabla)
    if usuario_id is not None:
        q = q.filter(AuditLog.usuario_id == usuario_id)
    if fecha_desde is not None:
        q = q.filter(AuditLog.created_at >= fecha_desde)
    if fecha_hasta is not None:
        q = q.filter(AuditLog.created_at <= fecha_hasta)
    total = q.count()
    offset = (page - 1) * page_size
    items = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size).all()
    return items, total


def create_audit_log(
    db: Session,
    usuario_id: int,
    accion: str,
    tabla_afectada: str,
    registro_id: int,
    descripcion: str,
    ip: str
):

    audit = AuditLog(
        usuario_id=usuario_id,
        accion=accion,
        tabla_afectada=tabla_afectada,
        registro_id=registro_id,
        descripcion=descripcion,
        ip=ip
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return audit