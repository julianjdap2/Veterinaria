"""
auth_service.py

Lógica de negocio para autenticación.
"""

from sqlalchemy.orm import Session

from app.repositories.usuario_repository import get_user_by_email
from app.security.auth import verify_password, create_access_token


def login_user(db: Session, email: str, password: str):

    user = get_user_by_email(db, email)

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    # empresa_id/rol_id en el JWT son informativos para el cliente; la API autoriza solo con user_id → usuario en BD.
    token = create_access_token(
        {
            "user_id": user.id,
            "empresa_id": user.empresa_id,
            "rol_id": user.rol_id,
        }
    )

    return token