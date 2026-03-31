import json

from sqlalchemy import Column, Integer, Text, TIMESTAMP, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class Consulta(Base):
    __tablename__ = "consultas"

    id = Column(Integer, primary_key=True, index=True)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True, index=True)
    veterinario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cita_id = Column(Integer, ForeignKey("citas.id"), nullable=True)
    fecha_consulta = Column(DateTime, nullable=True)
    motivo_consulta = Column(Text)
    diagnostico = Column(Text)
    tratamiento = Column(Text)
    observaciones = Column(Text)
    extras_clinicos_json = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    mascota = relationship("Mascota")
    empresa = relationship("Empresa")
    veterinario = relationship("Usuario")
    cita = relationship("Cita", foreign_keys=[cita_id])

    @property
    def extras_clinicos(self):
        raw = self.extras_clinicos_json
        if not raw or not str(raw).strip():
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

