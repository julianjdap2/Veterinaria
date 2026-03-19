"""
cita_schema.py

Schemas Pydantic para el módulo de citas/agenda.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field


EstadoCitaStr = Literal["pendiente", "confirmada", "cancelada", "atendida"]


class CitaBase(BaseModel):
    """Campos comunes de una cita."""

    mascota_id: int
    fecha: Optional[datetime] = None
    motivo: Optional[str] = Field(None, max_length=200)
    estado: Optional[EstadoCitaStr] = "pendiente"
    veterinario_id: Optional[int] = None


class CitaCreate(CitaBase):
    """Payload para crear una cita."""

    pass


class CitaUpdate(BaseModel):
    """Payload para actualizar una cita (parcial)."""

    fecha: Optional[datetime] = None
    motivo: Optional[str] = Field(None, max_length=200)
    estado: Optional[EstadoCitaStr] = None
    veterinario_id: Optional[int] = None


class CitaResponse(CitaBase):
    """Respuesta de una cita."""

    id: int
    veterinario_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
