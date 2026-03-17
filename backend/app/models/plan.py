"""
plan.py

Modelo ORM que representa los planes de suscripción
del sistema SaaS de veterinarias.
"""

from sqlalchemy import Column, Integer, String, Boolean, DECIMAL, TIMESTAMP
from sqlalchemy.sql import func
from app.database.database import Base


class Plan(Base):

    __tablename__ = "planes"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String(50), nullable=False)

    precio = Column(DECIMAL(10, 2), nullable=False)

    max_usuarios = Column(Integer)

    max_mascotas = Column(Integer)

    modulo_agenda = Column(Boolean, default=True)

    modulo_marketing = Column(Boolean, default=False)

    modulo_whatsapp = Column(Boolean, default=False)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )