"""
auth.py

Funciones de seguridad:
- hash de contraseñas
- verificación de contraseñas
- generación de JWT
"""

from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

from app.config import settings


# Contexto de hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str):
    """
    Genera hash seguro de contraseña
    """
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    """
    Verifica si contraseña coincide con el hash
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    """
    Genera un JWT token
    """

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt