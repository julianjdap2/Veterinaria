"""
auth_controller.py

Endpoints de autenticación. Login con rate limit por IP.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.empresa import Empresa
from app.models.usuario import Usuario
from app.schemas.auth_schema import LoginRequest, SessionMeResponse, TokenResponse
from app.security.dependencies import get_current_user
from app.services.auth_service import login_user
from app.core.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Iniciar sesión",
    description="Devuelve un JWT si las credenciales son correctas. Limitado por IP.",
)
@limiter.limit("10/minute")
def login(
    request: Request,
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    """Autentica con email y contraseña; devuelve access_token."""
    token = login_user(db, data.email, data.password)
    if not token:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {"access_token": token}


@router.get(
    "/me",
    response_model=SessionMeResponse,
    summary="Sesión actual",
    description="Nombre de usuario, empresa y email para pantallas de bienvenida (requiere JWT).",
)
def session_me(
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    empresa = db.query(Empresa).filter(Empresa.id == user.empresa_id).first()
    return SessionMeResponse(
        email=(user.email or "").strip(),
        usuario_nombre=(user.nombre or "").strip(),
        empresa_nombre=(empresa.nombre or "").strip() if empresa else "",
    )