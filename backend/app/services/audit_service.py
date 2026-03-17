from sqlalchemy.orm import Session

from app.repositories.audit_repository import create_audit_log


def registrar_accion(
    db: Session,
    usuario_id: int,
    accion: str,
    tabla: str,
    registro_id: int,
    descripcion: str,
    ip: str = None
):

    return create_audit_log(
        db=db,
        usuario_id=usuario_id,
        accion=accion,
        tabla_afectada=tabla,
        registro_id=registro_id,
        descripcion=descripcion,
        ip=ip
    )