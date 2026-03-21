"""
usuario.py

Modelo de usuarios del sistema.

Representa a los usuarios que pueden
acceder a la aplicación.
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class Usuario(Base):
    """
    Modelo ORM de la tabla usuarios
    """

    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String(100), nullable=False)

    email = Column(String(120), unique=True, nullable=False)

    password_hash = Column(String(255), nullable=False)

    rol_id = Column(Integer, ForeignKey("roles.id"))

    activo = Column(Boolean, default=True)
    
    empresa_id = Column(Integer, ForeignKey("empresas.id"))

    perfil_admin_id = Column(Integer, ForeignKey("empresa_perfiles_admin.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )

    rol = relationship("Rol")
    empresa = relationship("Empresa", back_populates="usuarios")