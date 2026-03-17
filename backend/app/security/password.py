"""
Módulo de manejo de contraseñas.

Este archivo se encarga de:
- Hashear contraseñas
- Verificar contraseñas
"""

from passlib.context import CryptContext

# Configuración de hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str) -> str:
    """
    Genera hash seguro de contraseña.
    """

    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si la contraseña coincide con el hash.
    """

    return pwd_context.verify(
        plain_password,
        hashed_password
    )