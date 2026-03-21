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
from app.models.empresa_perfil_admin import EmpresaPerfilAdmin
from app.security.password import hash_password
from app.repositories.usuario_repository import (
    get_user_by_email,
    count_users_by_empresa,
    get_usuario_by_id_and_empresa,
    update_usuario_activo as repo_update_usuario_activo,
    update_usuario_password_hash,
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
    perfil_admin_id: int | None = None,
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

    perfil_resuelto: int | None = None
    if perfil_admin_id is not None:
        if rol_id != 1:
            raise ApiError(
                code="perfil_admin_invalid_rol",
                message="El perfil admin solo aplica a usuarios con rol administrador",
                status_code=400,
            )
        perfil = (
            db.query(EmpresaPerfilAdmin)
            .filter(
                EmpresaPerfilAdmin.id == perfil_admin_id,
                EmpresaPerfilAdmin.empresa_id == empresa_id,
            )
            .first()
        )
        if not perfil:
            raise ApiError(
                code="perfil_admin_not_found",
                message="Perfil de administrador no encontrado en esta empresa",
                status_code=404,
            )
        perfil_resuelto = perfil_admin_id

    nuevo_usuario = Usuario(
        nombre=nombre,
        email=email,
        password_hash=hash_password(password),
        rol_id=rol_id,
        empresa_id=empresa.id,
        activo=True,
        perfil_admin_id=perfil_resuelto,
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return nuevo_usuario


def cambiar_password_usuario_por_admin(
    db: Session,
    *,
    usuario_id: int,
    empresa_id: int,
    admin_user_id: int,
    nueva_password: str,
) -> Usuario:
    """
    Permite al admin de empresa establecer una nueva contraseña para un usuario de su misma empresa.
    No permite modificar usuarios de rol superadmin (plataforma).
    """
    usuario = get_usuario_by_id_and_empresa(db, usuario_id, empresa_id)
    if not usuario:
        raise ApiError(
            code="usuario_not_found",
            message="Usuario no encontrado",
            status_code=404,
        )
    if usuario.rol_id == 4:
        raise ApiError(
            code="cannot_reset_superadmin_password",
            message="No se puede restablecer la contraseña de un superadmin desde esta empresa",
            status_code=403,
        )
    _ = admin_user_id  # reservado para auditoría futura
    updated = update_usuario_password_hash(db, usuario_id, empresa_id, hash_password(nueva_password))
    if not updated:
        raise ApiError(
            code="usuario_not_found",
            message="Usuario no encontrado",
            status_code=404,
        )
    return updated


def patch_usuario_por_admin(
    db: Session,
    usuario: Usuario,
    updates: dict,
) -> Usuario:
    """Actualiza campos permitidos según dict (solo claves presentes)."""
    if "activo" in updates and updates["activo"] is not None:
        usuario.activo = bool(updates["activo"])
    if "perfil_admin_id" in updates:
        pid = updates["perfil_admin_id"]
        if pid is not None:
            if usuario.rol_id != 1:
                raise ApiError(
                    code="perfil_admin_invalid_rol",
                    message="Solo los usuarios con rol administrador pueden tener un perfil admin",
                    status_code=400,
                )
            perfil = (
                db.query(EmpresaPerfilAdmin)
                .filter(
                    EmpresaPerfilAdmin.id == pid,
                    EmpresaPerfilAdmin.empresa_id == usuario.empresa_id,
                )
                .first()
            )
            if not perfil:
                raise ApiError(
                    code="perfil_admin_not_found",
                    message="Perfil de administrador no encontrado en esta empresa",
                    status_code=404,
                )
            usuario.perfil_admin_id = int(pid)
        else:
            usuario.perfil_admin_id = None
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


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