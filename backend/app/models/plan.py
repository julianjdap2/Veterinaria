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
    codigo = Column(String(30), nullable=False, default="STANDARD")

    precio = Column(DECIMAL(10, 2), nullable=False)

    max_usuarios = Column(Integer)

    max_mascotas = Column(Integer)
    max_citas_mes = Column(Integer)

    modulo_agenda = Column(Boolean, default=True)

    modulo_marketing = Column(Boolean, default=False)

    modulo_whatsapp = Column(Boolean, default=False)
    modulo_inventario = Column(Boolean, default=True)
    modulo_ventas = Column(Boolean, default=True)
    modulo_reportes = Column(Boolean, default=True)
    modulo_facturacion_electronica = Column(Boolean, default=False)

    feature_recordatorios_automaticos = Column(Boolean, default=True)
    feature_dashboard_avanzado = Column(Boolean, default=False)
    feature_exportaciones = Column(Boolean, default=True)

    soporte_nivel = Column(String(20), nullable=False, default="basico")  # basico, premium

    created_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )