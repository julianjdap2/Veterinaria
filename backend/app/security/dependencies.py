"""
dependencies.py

Valida token JWT y obtiene usuario autenticado
"""

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.usuario import Usuario
from app.config import settings


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    print("TOKEN RECIBIDO:", token)

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        print("PAYLOAD:", payload)

        user_id = payload.get("user_id")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Token inválido"
            )

    except Exception as e:

        print("ERROR AL DECODIFICAR JWT:", str(e))

        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado"
        )

    user = db.query(Usuario).filter(
        Usuario.id == user_id
    ).first()

    print("USUARIO ENCONTRADO:", user)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Usuario no encontrado"
        )

    return user