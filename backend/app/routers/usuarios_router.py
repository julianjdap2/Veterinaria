"""
Router para gestión de usuarios. Solo ADMIN.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.errors import ApiError
from app.security.roles import require_roles
from app.schemas.usuario_schema import UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.schemas.common_schema import PaginatedResponse
from app.services.usuario_service import crear_usuario, actualizar_activo_usuario
from app.repositories.usuario_repository import (
    listar_usuarios_por_empresa,
    listar_veterinarios_por_empresa,
    count_users_by_empresa,
    get_usuario_by_id_and_empresa,
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


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
    """Lista usuarios de la empresa (solo ADMIN)."""
    total = count_users_by_empresa(db, current_user.empresa_id)
    items = listar_usuarios_por_empresa(db, current_user.empresa_id, page=page, page_size=page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/veterinarios",
    response_model=list[UsuarioResponse],
    summary="Listar veterinarios",
)
def listar_veterinarios(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),
):
    """Lista veterinarios de la empresa (ADMIN y RECEPCIÓN, para asignar a citas)."""
    return listar_veterinarios_por_empresa(db, current_user.empresa_id)


@router.post("/", response_model=UsuarioResponse)
def crear_usuario_endpoint(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
):
    """Crea un usuario en la empresa del usuario autenticado."""
    usuario = crear_usuario(
        db,
        payload.nombre,
        payload.email,
        payload.password,
        payload.rol_id,
        current_user.empresa_id,
    )
    return usuario


@router.patch("/{usuario_id}", response_model=UsuarioResponse)
def actualizar_usuario(
    usuario_id: int,
    payload: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
):
    """Activa o desactiva un usuario (solo ADMIN). Body: { \"activo\": true | false }."""
    if payload.activo is None:
        usuario = get_usuario_by_id_and_empresa(db, usuario_id, current_user.empresa_id)
        if not usuario:
            raise ApiError(code="usuario_not_found", message="Usuario no encontrado", status_code=404)
        return usuario
    return actualizar_activo_usuario(db, usuario_id, current_user.empresa_id, payload.activo)