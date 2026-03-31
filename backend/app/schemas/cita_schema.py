"""
cita_schema.py

Schemas Pydantic para el módulo de citas/agenda.
"""

from datetime import datetime, date
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.extras_clinicos_schema import CitaExtrasClinicos


EstadoCitaStr = Literal["pendiente", "confirmada", "cancelada", "atendida", "revision"]


class CitaBase(BaseModel):
    """Campos comunes de una cita."""

    mascota_id: int | None = None
    fecha: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    motivo: Optional[str] = Field(None, max_length=200)
    notas: Optional[str] = None
    urgente: Optional[bool] = False
    sin_hora_definida: Optional[bool] = False
    en_sala_espera: Optional[bool] = False
    estado: Optional[EstadoCitaStr] = "pendiente"
    veterinario_id: Optional[int] = None
    encargados_ids: list[int] = Field(default_factory=list)
    extras_clinicos: Optional[CitaExtrasClinicos] = None


class CitaCreate(CitaBase):
    """Payload para crear una cita."""

    solo_reservar_espacio: bool = False


class CitaUpdate(BaseModel):
    """Payload para actualizar una cita (parcial)."""

    fecha: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    motivo: Optional[str] = Field(None, max_length=200)
    notas: Optional[str] = None
    urgente: Optional[bool] = None
    sin_hora_definida: Optional[bool] = None
    en_sala_espera: Optional[bool] = None
    estado: Optional[EstadoCitaStr] = None
    veterinario_id: Optional[int] = None
    encargados_ids: Optional[list[int]] = None
    extras_clinicos: Optional[CitaExtrasClinicos] = None


class CitaResponse(CitaBase):
    """Respuesta de una cita."""

    id: int
    veterinario_id: Optional[int] = None
    veterinario_nombre: Optional[str] = None
    mascota_nombre: Optional[str] = Field(default=None, description="Nombre de la mascota (enriquecido en API).")
    cliente_nombre: Optional[str] = Field(default=None, description="Nombre del propietario (enriquecido en API).")

    model_config = ConfigDict(from_attributes=True)


class CitasDisponibilidadResponse(BaseModel):
    fecha: date
    veterinario_id: int
    disponible: list[str]  # ['08:00', '08:30', ...]
    reservado: list[str]  # slots ocupados dentro de la jornada


class CitaLlegadaCreate(BaseModel):
    """Crea cita por orden de llegada con asignación automática."""

    mascota_id: int
    motivo: Optional[str] = Field(None, max_length=200)
    notas: Optional[str] = None
    urgente: bool = False
    encargados_ids: list[int] = Field(default_factory=list)
    veterinario_preferido_id: Optional[int] = None
    fecha_llegada: Optional[datetime] = None
    extras_clinicos: Optional[CitaExtrasClinicos] = None


class ListaEsperaCreate(BaseModel):
    mascota_id: int
    veterinario_id: int
    fecha: datetime
    motivo: Optional[str] = Field(None, max_length=200)
    notas: Optional[str] = None
    urgente: bool = False


class ListaEsperaResponse(BaseModel):
    id: int
    empresa_id: int
    mascota_id: int
    veterinario_id: int
    fecha: datetime
    urgente: bool
    motivo: Optional[str] = None
    notas: Optional[str] = None
    estado: str
    procesada: bool
    created_at: datetime
    procesada_en: Optional[datetime] = None
    cita_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
