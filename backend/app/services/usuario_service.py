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
    get_user_by_email_excluding_id,
    count_users_by_empresa,
    count_active_admins_empresa,
    get_usuario_by_id_and_empresa,
    update_usuario_activo as repo_update_usuario_activo,
    update_usuario_password_hash,
)
from app.core.errors import ApiError
from app.schemas.usuario_schema import UsuarioDetalleResponse
from app.services.usuario_extendido import apply_extendido_patch_dict, parse_extendido_json, serialize_extendido

_ROLES_EMPRESA = frozenset({1, 2, 3})


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


def _assert_usuario_editable_por_empresa(usuario: Usuario) -> None:
    if usuario.rol_id == 4:
        raise ApiError(
            code="cannot_edit_superadmin",
            message="No se puede editar un usuario superadmin desde la empresa",
            status_code=403,
        )


def usuario_a_detalle(usuario: Usuario) -> UsuarioDetalleResponse:
    ext = parse_extendido_json(usuario.extendido_json)
    return UsuarioDetalleResponse(
        id=usuario.id,
        empresa_id=usuario.empresa_id,
        activo=usuario.activo,
        created_at=usuario.created_at,
        nombre=usuario.nombre,
        email=usuario.email,
        rol_id=usuario.rol_id,
        perfil_admin_id=usuario.perfil_admin_id,
        documento=usuario.documento,
        telefono=usuario.telefono,
        extendido=ext,
    )


def patch_usuario_por_admin(
    db: Session,
    usuario: Usuario,
    updates: dict,
) -> Usuario:
    """Actualiza campos permitidos según dict (solo claves presentes)."""
    _assert_usuario_editable_por_empresa(usuario)

    if "nombre" in updates and updates["nombre"] is not None:
        usuario.nombre = str(updates["nombre"]).strip()

    if "email" in updates and updates["email"] is not None:
        email = str(updates["email"]).strip().lower()
        if get_user_by_email_excluding_id(db, email, usuario.id) is not None:
            raise ApiError(
                code="email_already_registered",
                message="Email ya registrado",
                status_code=400,
            )
        usuario.email = email

    if "documento" in updates:
        usuario.documento = (str(updates["documento"]).strip() or None) if updates["documento"] is not None else None

    if "telefono" in updates:
        usuario.telefono = (str(updates["telefono"]).strip() or None) if updates["telefono"] is not None else None

    if "rol_id" in updates and updates["rol_id"] is not None:
        new_r = int(updates["rol_id"])
        if new_r not in _ROLES_EMPRESA:
            raise ApiError(
                code="rol_invalido",
                message="Rol no permitido para usuarios de empresa",
                status_code=400,
            )
        if usuario.rol_id == 1 and new_r != 1:
            if count_active_admins_empresa(db, usuario.empresa_id, exclude_user_id=usuario.id) < 1:
                raise ApiError(
                    code="last_admin_required",
                    message="Debe existir al menos un administrador activo en la empresa",
                    status_code=400,
                )
        usuario.rol_id = new_r
        if new_r != 1:
            usuario.perfil_admin_id = None

    if "activo" in updates and updates["activo"] is not None:
        new_act = bool(updates["activo"])
        if not new_act and usuario.rol_id == 1 and usuario.activo is True:
            if count_active_admins_empresa(db, usuario.empresa_id, exclude_user_id=usuario.id) < 1:
                raise ApiError(
                    code="last_admin_required",
                    message="Debe existir al menos un administrador activo en la empresa",
                    status_code=400,
                )
        usuario.activo = new_act

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

    if "extendido" in updates and updates["extendido"]:
        ext_patch = updates["extendido"]
        if isinstance(ext_patch, dict) and ext_patch:
            cur = parse_extendido_json(usuario.extendido_json)
            merged = apply_extendido_patch_dict(cur, ext_patch)
            usuario.extendido_json = serialize_extendido(merged)

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
    usuario = get_usuario_by_id_and_empresa(db, usuario_id, empresa_id)
    if not usuario:
        raise ApiError(
            code="usuario_not_found",
            message="Usuario no encontrado",
            status_code=404,
        )
    _assert_usuario_editable_por_empresa(usuario)
    if not activo and usuario.rol_id == 1 and usuario.activo is True:
        if count_active_admins_empresa(db, empresa_id, exclude_user_id=usuario_id) < 1:
            raise ApiError(
                code="last_admin_required",
                message="Debe existir al menos un administrador activo en la empresa",
                status_code=400,
            )
    updated = repo_update_usuario_activo(db, usuario_id, empresa_id, activo)
    if not updated:
        raise ApiError(
            code="usuario_not_found",
            message="Usuario no encontrado",
            status_code=404,
        )
    return updated