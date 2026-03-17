"""
roles.py

Control de permisos por rol
"""

from fastapi import HTTPException, Depends
from app.security.dependencies import get_current_user


def require_roles(*allowed_roles):
    """
    Verifica si el usuario tiene uno de los roles permitidos.
    """

    def role_checker(user=Depends(get_current_user)):

        if user.rol_id not in allowed_roles:

            raise HTTPException(
                status_code=403,
                detail="No tienes permisos para realizar esta acción"
            )

        return user

    return role_checker