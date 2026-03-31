"""
cliente.py

Modelo de clientes.

Representa a los dueños de mascotas.
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.database import Base


class Cliente(Base):
    """
    Modelo ORM de la tabla clientes
    """

    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String(100), nullable=False)

    documento = Column(String(20), unique=True)

    tipo_documento = Column(String(10), nullable=True)

    telefono = Column(String(20))

    celular = Column(String(30), nullable=True)

    telefono_fijo = Column(String(30), nullable=True)

    contacto = Column(String(30), nullable=True)

    tipo_contacto = Column(String(50), nullable=True)

    direccion = Column(String(200))

    email = Column(String(100))

    empresa_id = Column(Integer, ForeignKey("empresas.id"))

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
    )
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=True)
    activo = Column(Boolean, default=True)

    mascotas = relationship("Mascota", back_populates="cliente")
    empresa = relationship("Empresa", back_populates="clientes")
    vinculos_empresa = relationship("ClienteEmpresaVinculo", back_populates="cliente")