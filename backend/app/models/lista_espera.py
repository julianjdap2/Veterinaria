from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class ListaEspera(Base):
    """Lista de espera para slots ocupados (priorización simple por antigüedad)."""

    __tablename__ = "lista_espera"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)

    mascota_id = Column(Integer, ForeignKey("mascotas.id", ondelete="CASCADE"), nullable=False)
    veterinario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(DateTime, nullable=False)  # slot start

    motivo = Column(String(200), nullable=True)
    notas = Column(Text, nullable=True)
    urgente = Column(Boolean, default=False, nullable=False)
    estado = Column(String(20), default="pendiente", nullable=False)

    procesada = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    procesada_en = Column(DateTime, nullable=True)

    cita_id = Column(Integer, ForeignKey("citas.id", ondelete="SET NULL"), nullable=True)

