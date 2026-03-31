"""
cita.py

Modelo ORM para citas/agenda. Cada cita está asociada a una mascota;
el acceso por clínica se deriva del vínculo propietario–empresa (y nivel parcial/completo).
"""

import json

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship

from app.database.database import Base


class Cita(Base):
    """Cita o turno para una mascota (tabla `citas`)."""

    __tablename__ = "citas"

    id = Column(Integer, primary_key=True, index=True)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True, index=True)
    veterinario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)
    motivo = Column(String(200), nullable=True)
    notas = Column(Text, nullable=True)
    urgente = Column(Boolean, default=False, nullable=False)
    sin_hora_definida = Column(Boolean, default=False, nullable=False)
    en_sala_espera = Column(Boolean, default=False, nullable=False)
    estado = Column(String(20), default="pendiente", nullable=True)
    encargados_json = Column(Text, nullable=True)
    extras_clinicos_json = Column(Text, nullable=True)

    mascota = relationship("Mascota", backref="citas")
    empresa = relationship("Empresa")
    veterinario = relationship("Usuario", backref="citas_asignadas")

    @property
    def extras_clinicos(self):
        raw = self.extras_clinicos_json
        if not raw or not str(raw).strip():
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

    @property
    def encargados_ids(self):
        raw = self.encargados_json
        if not raw or not str(raw).strip():
            return []
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                out: list[int] = []
                for x in parsed:
                    try:
                        out.append(int(x))
                    except (TypeError, ValueError):
                        continue
                return out
            return []
        except json.JSONDecodeError:
            return []
