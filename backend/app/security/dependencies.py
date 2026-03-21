"""
dependencies.py
"""

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.empresa import Empresa
from app.models.usuario import Usuario
from app.config import settings
from app.utils.audit_context import set_audit_context


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado"
        )

    user = db.query(Usuario).filter(Usuario.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Usuario no encontrado"
        )

    # Bloqueo global por estado de empresa (excepto superadmin plataforma).
    if user.rol_id != 4:
        empresa = db.query(Empresa).filter(Empresa.id == user.empresa_id).first()
        if not empresa:
            raise HTTPException(status_code=401, detail="Empresa no encontrada")
        if bool(getattr(empresa, "deleted_at", None)):
            raise HTTPException(status_code=403, detail="Empresa eliminada/inactiva")
        estado = (getattr(empresa, "estado", "activa") or "activa").lower()
        if not empresa.activa or estado == "suspendida":
            raise HTTPException(status_code=403, detail="Empresa suspendida. Contacta al superadmin.")

    # Establecer contexto de auditoría para este request
    client_ip = None
    if request.headers.get("x-forwarded-for"):
        client_ip = request.headers.get("x-forwarded-for").split(",")[0].strip()
    elif request.client:
        client_ip = request.client.host

    set_audit_context(user.id, client_ip)

    return user