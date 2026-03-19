"""
Servicio de gestión de usuarios.

Contiene la lógica de negocio para:
- crear usuarios
- validar límites de plan
- validar empresa
"""

from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.plan import Plan
from app.security.password import hash_password
from app.repositories.usuario_repository import (
    get_user_by_email,
    count_users_by_empresa,
    get_usuario_by_id_and_empresa,
    update_usuario_activo as repo_update_usuario_activo,
)
from app.core.errors import ApiError


def _obtener_empresa_y_plan(db: Session, empresa_id: int) -> tuple[Empresa, Plan]:
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise ApiError(
            code="empresa_not_found",
            message="Empresa no encontrada",
            status_code=404,
        )

    plan = db.query(Plan).filter(Plan.id == empresa.plan_id).first()
    if not plan:
        raise ApiError(
            code="plan_not_found",
            message="Plan asociado a la empresa no encontrado",
            status_code=500,
        )

    return empresa, plan


def crear_usuario(
    db: Session,
    nombre: str,
    email: str,
    password: str,
    rol_id: int,
    empresa_id: int,
) -> Usuario:
    """
    Crea un usuario para una empresa validando:
    - existencia de la empresa y su plan
    - límite de usuarios del plan
    - unicidad del email
    """

    empresa, plan = _obtener_empresa_y_plan(db, empresa_id)

    total_usuarios = count_users_by_empresa(db, empresa.id)
    if plan.max_usuarios is not None and total_usuarios >= plan.max_usuarios:
        raise ApiError(
            code="plan_user_limit_reached",
            message="Límite de usuarios alcanzado para el plan",
            status_code=400,
        )

    if get_user_by_email(db, email) is not None:
        raise ApiError(
            code="email_already_registered",
            message="Email ya registrado",
            status_code=400,
        )

    nuevo_usuario = Usuario(
        nombre=nombre,
        email=email,
        password_hash=hash_password(password),
        rol_id=rol_id,
        empresa_id=empresa.id,
        activo=True,
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return nuevo_usuario


def actualizar_activo_usuario(
    db: Session,
    usuario_id: int,
    empresa_id: int,
    activo: bool,
) -> Usuario:
    """Activa o desactiva un usuario de la empresa. Lanza ApiError si no existe."""
    usuario = repo_update_usuario_activo(db, usuario_id, empresa_id, activo)
    if not usuario:
        raise ApiError(
            code="usuario_not_found",
            message="Usuario no encontrado",
            status_code=404,
        )
    return usuario