"""
suscripcion.py

Modelo que registra la suscripción de cada veterinaria
a un plan del sistema.
"""

from sqlalchemy import Column, Integer, ForeignKey, Date, String, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class Suscripcion(Base):

    __tablename__ = "suscripciones"

    id = Column(Integer, primary_key=True, index=True)

    empresa_id = Column(Integer, ForeignKey("empresas.id"))

    plan_id = Column(Integer, ForeignKey("planes.id"))

    fecha_inicio = Column(Date)

    fecha_fin = Column(Date)

    estado = Column(String(50))

    created_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )

    empresa = relationship("Empresa")

    plan = relationship("Plan")