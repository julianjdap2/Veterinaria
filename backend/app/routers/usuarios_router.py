"""
Router para gestión de usuarios.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.security.dependencies import get_current_user
from app.services.usuario_service import crear_usuario

from app.services.audit_service import registrar_accion

from fastapi import HTTPException

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.post("/")
def crear_usuario_endpoint(
    nombre: str,
    email: str,
    password: str,
    rol_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Crea un usuario dentro de la empresa del usuario autenticado.
    """

    # validar que sea admin
    if current_user.rol_id != 1:
        raise HTTPException(
        status_code=403,
        detail="No autorizado"
    )

    # Crear usuario
    usuario = crear_usuario(
        db,
        nombre,
        email,
        password,
        rol_id,
        current_user.empresa_id
    )

    # Registrar acción en audit logs
    registrar_accion(
        db=db,
        usuario_id=current_user.id,
        accion="CREATE_USER",
        tabla="usuarios",
        registro_id=usuario.id,
        descripcion=f"Creación de usuario {usuario.email}"
    )

    return usuario
    
    