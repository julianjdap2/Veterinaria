"""
usuario_repository.py

Consultas de base de datos relacionadas
con usuarios.
"""

from sqlalchemy.orm import Session

from app.models.usuario import Usuario


def get_user_by_email(db: Session, email: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.email == email).first()


def get_user_by_email_excluding_id(db: Session, email: str, exclude_id: int) -> Usuario | None:
    return (
        db.query(Usuario)
        .filter(Usuario.email == email, Usuario.id != exclude_id)
        .first()
    )


def count_active_admins_empresa(db: Session, empresa_id: int, *, exclude_user_id: int | None = None) -> int:
    q = db.query(Usuario).filter(
        Usuario.empresa_id == empresa_id,
        Usuario.rol_id == 1,
        Usuario.activo.is_(True),
    )
    if exclude_user_id is not None:
        q = q.filter(Usuario.id != exclude_user_id)
    return q.count()


def count_users_by_empresa(db: Session, empresa_id: int) -> int:
    return db.query(Usuario).filter(Usuario.empresa_id == empresa_id).count()


def listar_usuarios_por_empresa(
    db: Session,
    empresa_id: int,
    page: int = 1,
    page_size: int = 20,
) -> list[Usuario]:
    offset = (page - 1) * page_size
    return (
        db.query(Usuario)
        .filter(Usuario.empresa_id == empresa_id)
        .order_by(Usuario.id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )


def get_usuario_by_id_and_empresa(db: Session, usuario_id: int, empresa_id: int) -> Usuario | None:
    return (
        db.query(Usuario)
        .filter(Usuario.id == usuario_id, Usuario.empresa_id == empresa_id)
        .first()
    )


def listar_veterinarios_por_empresa(
    db: Session, empresa_id: int, *, solo_agenda_personal: bool = False
) -> list[Usuario]:
    """Lista usuarios con rol veterinario (rol_id=2) activos de la empresa."""
    from app.security.usuario_operativo import operativo_para_enforcement

    q = (
        db.query(Usuario)
        .filter(
            Usuario.empresa_id == empresa_id,
            Usuario.rol_id == 2,
            Usuario.activo.is_(True),
        )
        .order_by(Usuario.nombre)
    )
    vets = q.all()
    if solo_agenda_personal:
        vets = [v for v in vets if operativo_para_enforcement(v).agenda_personal]
    return vets


def update_usuario_activo(db: Session, usuario_id: int, empresa_id: int, activo: bool) -> Usuario | None:
    usuario = get_usuario_by_id_and_empresa(db, usuario_id, empresa_id)
    if not usuario:
        return None
    usuario.activo = activo
    db.commit()
    db.refresh(usuario)
    return usuario


def update_usuario_password_hash(db: Session, usuario_id: int, empresa_id: int, password_hash: str) -> Usuario | None:
    usuario = get_usuario_by_id_and_empresa(db, usuario_id, empresa_id)
    if not usuario:
        return None
    usuario.password_hash = password_hash
    db.commit()
    db.refresh(usuario)
    return usuario
