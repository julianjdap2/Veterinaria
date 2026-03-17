"""
Servicio de gestión de usuarios.

Contiene la lógica de negocio para:
- crear usuarios
- validar límites de plan
- validar empresa
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.plan import Plan
from app.security.password import hash_password
from app.database import get_db


def crear_usuario(
    db: Session,
    nombre: str,
    email: str,
    password: str,
    rol_id: int,
    empresa_id: int
):
    """
    Crea un usuario para una empresa
    validando el límite del plan.
    """

    # buscar empresa
    empresa = db.query(Empresa).filter(
        Empresa.id == empresa_id
    ).first()

    if not empresa:
        raise HTTPException(
            status_code=404,
            detail="Empresa no encontrada"
        )

    # obtener plan
    plan = db.query(Plan).filter(
        Plan.id == empresa.plan_id
    ).first()

    # contar usuarios actuales
    total_usuarios = db.query(Usuario).filter(
        Usuario.empresa_id == empresa_id
    ).count()

    # validar límite de plan
    if total_usuarios >= plan.max_usuarios:
        raise HTTPException(
            status_code=400,
            detail="Límite de usuarios alcanzado para el plan"
        )

    # validar email único
    existe = db.query(Usuario).filter(
        Usuario.email == email
    ).first()

    if existe:
        raise HTTPException(
            status_code=400,
            detail="Email ya registrado"
        )

    # crear usuario
    nuevo_usuario = Usuario(
        nombre=nombre,
        email=email,
        password_hash=hash_password(password),
        rol_id=rol_id,
        empresa_id=empresa_id,
        activo=True
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return nuevo_usuario