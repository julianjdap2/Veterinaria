"""Plan de salud / paquete de servicios por clínica (empresa)."""

from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, Numeric, String, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.database import Base


class PlanSalud(Base):
    __tablename__ = "plan_salud"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    precio = Column(Numeric(12, 2), nullable=False, default=0)
    periodicidad_meses = Column(Integer, nullable=False, default=1)
    especies_ids_json = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=True, onupdate=func.now())

    coberturas = relationship("PlanSaludCobertura", back_populates="plan", cascade="all, delete-orphan")
    afiliaciones = relationship("PlanAfiliacion", back_populates="plan")


class PlanSaludCobertura(Base):
    __tablename__ = "plan_salud_cobertura"

    id = Column(Integer, primary_key=True, index=True)
    plan_salud_id = Column(Integer, ForeignKey("plan_salud.id", ondelete="CASCADE"), nullable=False, index=True)
    categoria_codigo = Column(String(80), nullable=False)
    nombre_servicio = Column(String(200), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    cobertura_maxima = Column(Numeric(12, 2), nullable=True)

    plan = relationship("PlanSalud", back_populates="coberturas")
    usos = relationship("PlanAfiliacionUso", back_populates="cobertura")


class PlanAfiliacion(Base):
    __tablename__ = "plan_afiliacion"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    plan_salud_id = Column(Integer, ForeignKey("plan_salud.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=True, index=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    valor_pagado = Column(Numeric(12, 2), nullable=False, default=0)
    observaciones = Column(String(500), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    plan = relationship("PlanSalud", back_populates="afiliaciones")
    usos = relationship("PlanAfiliacionUso", back_populates="afiliacion", cascade="all, delete-orphan")


class PlanAfiliacionUso(Base):
    __tablename__ = "plan_afiliacion_uso"

    id = Column(Integer, primary_key=True, index=True)
    afiliacion_id = Column(Integer, ForeignKey("plan_afiliacion.id", ondelete="CASCADE"), nullable=False, index=True)
    cobertura_id = Column(Integer, ForeignKey("plan_salud_cobertura.id"), nullable=False)
    consumidos = Column(Integer, nullable=False, default=0)

    afiliacion = relationship("PlanAfiliacion", back_populates="usos")
    cobertura = relationship("PlanSaludCobertura", back_populates="usos")
