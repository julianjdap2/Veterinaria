"""
empresa.py

Representa una veterinaria dentro del sistema SaaS.

Cada empresa tiene:
- usuarios
- mascotas
- clientes
- suscripción activa
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class Empresa(Base):

    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String(150), nullable=False)

    nit = Column(String(30))

    telefono = Column(String(30))

    email = Column(String(150))

    direccion = Column(String(255))

    plan_id = Column(Integer, ForeignKey("planes.id"))

    activa = Column(Boolean, default=True)
    estado = Column(String(30), nullable=False, default="activa")  # activa, suspendida, en_prueba
    deleted_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )

    # Relaciones ORM

    plan = relationship("Plan")

    usuarios = relationship("Usuario", back_populates="empresa")

    clientes = relationship("Cliente", back_populates="empresa")

    mascotas = relationship("Mascota", back_populates="empresa")