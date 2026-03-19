"""
auth_controller.py

Endpoints de autenticación. Login con rate limit por IP.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.auth_schema import LoginRequest, TokenResponse
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