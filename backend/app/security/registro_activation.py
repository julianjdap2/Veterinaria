"""JWT de un solo propósito: abrir el enlace del correo y obtener sesión sin formulario de login."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import get_settings
from app.core.errors import ApiError

ACTIVATION_TOKEN_TYP = "registro_activacion"
ACTIVATION_EXPIRE_HOURS = 24


def create_registro_activation_token(user_id: int) -> str:
    s = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACTIVATION_EXPIRE_HOURS)
    to_encode = {"user_id": user_id, "typ": ACTIVATION_TOKEN_TYP, "exp": expire}
    return jwt.encode(to_encode, s.SECRET_KEY, algorithm=s.ALGORITHM)


def decode_registro_activation_token(token: str) -> int:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.SECRET_KEY, algorithms=[s.ALGORITHM])
    except JWTError:
        raise ApiError(
            code="activacion_invalida",
            message="El enlace no es válido o ha caducado. Solicita un nuevo correo o inicia sesión con tu contraseña.",
            status_code=400,
        )
    if payload.get("typ") != ACTIVATION_TOKEN_TYP:
        raise ApiError(
            code="activacion_invalida",
            message="El enlace no es válido.",
            status_code=400,
        )
    uid = payload.get("user_id")
    if not isinstance(uid, int):
        raise ApiError(code="activacion_invalida", message="El enlace no es válido.", status_code=400)
    return uid
