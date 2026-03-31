"""
Router para gestión de usuarios. Solo ADMIN.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.errors import ApiError
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.security.usuario_operativo import operativo_para_enforcement
from app.security.admin_permissions import require_admin_permission, permisos_efectivos_admin
from app.schemas.usuario_schema import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
    UsuarioDetalleResponse,
    UsuarioPasswordAdminReset,
    MisPermisosAdminResponse,
)
from app.schemas.superadmin_schema import EmpresaPerfilAdminResponse
from app.models.empresa_perfil_admin import EmpresaPerfilAdmin
from app.schemas.common_schema import PaginatedResponse
from app.services.usuario_service import (
    crear_usuario,
    actualizar_activo_usuario,
    patch_usuario_por_admin,
    cambiar_password_usuario_por_admin,
    usuario_a_detalle,
)
from app.services.usuario_extendido import UsuarioOperativo
from app.repositories.usuario_repository import (
    listar_usuarios_por_empresa,
    listar_veterinarios_por_empresa,
    count_users_by_empresa,
    get_usuario_by_id_and_empresa,
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get(
    "/perfiles-admin",
    response_model=list[EmpresaPerfilAdminResponse],
    summary="Perfiles de permisos admin de la empresa",
)
def listar_perfiles_admin_mi_empresa(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
):
    """Catálogo de perfiles configurados por el superadmin para asignar a administradores."""
    return (
        db.query(EmpresaPerfilAdmin)
        .filter(EmpresaPerfilAdmin.empresa_id == current_user.empresa_id)
        .order_by(EmpresaPerfilAdmin.nombre.asc())
        .all()
    )


@router.get(
    "/mi-permisos-admin",
    response_model=MisPermisosAdminResponse,
    summary="Mis permisos como administrador",
)
def mis_permisos_admin(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
):
    """
    Devuelve los permisos granulares configurados para admins de esta empresa.
    No exige un permiso concreto: cualquier admin puede consultar su matriz (útil para la UI).
    """
    data = permisos_efectivos_admin(db, current_user)
    return MisPermisosAdminResponse.model_validate(data)


@router.get(
    "/mi-operativo",
    response_model=UsuarioOperativo,
    summary="Mis privilegios operativos (consultorio, agenda, tutores)",
)
def mi_operativo(current_user=Depends(get_current_user)):
    """Para la UI del panel: ocultar o habilitar módulos según flags del usuario actual."""
    return operativo_para_enforcement(current_user)


@router.get(
    "/",
    response_model=PaginatedResponse[UsuarioResponse],
    summary="Listar usuarios",
)
def listar_usuarios(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
):
    """Lista usuarios de la empresa (cualquier ADMIN; la UI limita acciones según permisos granulares)."""
    total = count_users_by_empresa(db, current_user.empresa_id)
    items = listar_usuarios_por_empresa(db, current_user.empresa_id, page=page, page_size=page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/veterinarios",
    response_model=list[UsuarioResponse],
    summary="Listar veterinarios",
)
def listar_veterinarios(
    solo_agenda_personal: bool = Query(
        False,
        description="Si true, solo veterinarios con «agenda personal» habilitada (asignables en citas).",
    ),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),
):
    """Lista veterinarios de la empresa (ADMIN y RECEPCIÓN, para asignar a citas)."""
    return listar_veterinarios_por_empresa(
        db, current_user.empresa_id, solo_agenda_personal=solo_agenda_personal
    )


@router.get(
    "/{usuario_id}",
    response_model=UsuarioDetalleResponse,
    summary="Detalle de usuario (configuración)",
)
def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
):
    usuario = get_usuario_by_id_and_empresa(db, usuario_id, current_user.empresa_id)
    if not usuario:
        raise ApiError(code="usuario_not_found", message="Usuario no encontrado", status_code=404)
    return usuario_a_detalle(usuario)


@router.post("/", response_model=UsuarioResponse)
def crear_usuario_endpoint(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
    _perm=Depends(require_admin_permission("admin_gestion_usuarios")),
):
    """Crea un usuario en la empresa del usuario autenticado."""
    usuario = crear_usuario(
        db,
        payload.nombre,
        payload.email,
        payload.password,
        payload.rol_id,
        current_user.empresa_id,
        perfil_admin_id=payload.perfil_admin_id,
    )
    return usuario


@router.patch("/{usuario_id}", response_model=UsuarioResponse)
def actualizar_usuario(
    usuario_id: int,
    payload: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
    _perm=Depends(require_admin_permission("admin_gestion_usuarios")),
):
    """Actualiza datos del usuario (parcial)."""
    usuario = get_usuario_by_id_and_empresa(db, usuario_id, current_user.empresa_id)
    if not usuario:
        raise ApiError(code="usuario_not_found", message="Usuario no encontrado", status_code=404)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return usuario
    if set(updates.keys()) == {"activo"} and updates.get("activo") is not None:
        return actualizar_activo_usuario(db, usuario_id, current_user.empresa_id, updates["activo"])
    return patch_usuario_por_admin(db, usuario, updates)


@router.patch(
    "/{usuario_id}/password",
    response_model=UsuarioResponse,
    summary="Restablecer contraseña (admin)",
    description="Solo ADMIN con permiso de gestión de usuarios. Establece una nueva contraseña sin conocer la anterior.",
)
def restablecer_password_usuario(
    usuario_id: int,
    payload: UsuarioPasswordAdminReset,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
    _perm=Depends(require_admin_permission("admin_gestion_usuarios")),
):
    return cambiar_password_usuario_por_admin(
        db,
        usuario_id=usuario_id,
        empresa_id=current_user.empresa_id,
        admin_user_id=current_user.id,
        nueva_password=payload.password,
    )