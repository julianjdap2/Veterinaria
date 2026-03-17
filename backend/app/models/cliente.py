"""
cliente.py

Modelo de clientes.

Representa a los dueños de mascotas.
"""

from sqlalchemy import Column, Integer, String, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.database.database import Base

from sqlalchemy import Column, Integer, String, TIMESTAMP, Boolean


class Cliente(Base):
    """
    Modelo ORM de la tabla clientes
    """

    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String(100), nullable=False)

    documento = Column(String(20), unique=True)

    telefono = Column(String(20))

    direccion = Column(String(200))

    email = Column(String(100))
    
    empresa_id = Column(Integer, ForeignKey("empresas.id"))

    created_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )
    activo = Column(Boolean, default=True)

    mascotas = relationship("Mascota", back_populates="cliente")
    empresa = relationship("Empresa", back_populates="clientes")