from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


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