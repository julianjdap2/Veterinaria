"""
rol.py

Modelo de roles del sistema.

Define los diferentes tipos de usuarios
que pueden acceder al sistema.
"""

from sqlalchemy import Column, Integer, String, TIMESTAMP
from sqlalchemy.sql import func
from app.database.database import Base


class Rol(Base):
    """
    Modelo ORM de la tabla roles
    """

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String(50), nullable=False)

    descripcion = Column(String(255))

    created_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )