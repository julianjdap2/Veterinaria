"""
cita.py

Modelo ORM para citas/agenda. Cada cita está asociada a una mascota;
el aislamiento por empresa se hace vía mascota.empresa_id.
"""

"""
cita.py

Modelo ORM para citas/agenda. Cada cita está asociada a una mascota;
el aislamiento por empresa se hace vía mascota.empresa_id.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship

from app.database.database import Base


class Cita(Base):
    """Cita o turno para una mascota (tabla `citas`)."""

    __tablename__ = "citas"

    id = Column(Integer, primary_key=True, index=True)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=True)
    veterinario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha = Column(DateTime, nullable=True)
    motivo = Column(String(200), nullable=True)
    notas = Column(Text, nullable=True)
    urgente = Column(Boolean, default=False, nullable=False)
    en_sala_espera = Column(Boolean, default=False, nullable=False)
    estado = Column(String(20), default="pendiente", nullable=True)

    mascota = relationship("Mascota", backref="citas")
    veterinario = relationship("Usuario", backref="citas_asignadas")
