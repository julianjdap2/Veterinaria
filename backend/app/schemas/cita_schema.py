"""
cita_schema.py

Schemas Pydantic para el módulo de citas/agenda.
"""

from datetime import datetime, date
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field


EstadoCitaStr = Literal["pendiente", "confirmada", "cancelada", "atendida", "revision"]


class CitaBase(BaseModel):
    """Campos comunes de una cita."""

    mascota_id: int
    fecha: Optional[datetime] = None
    motivo: Optional[str] = Field(None, max_length=200)
    notas: Optional[str] = None
    urgente: Optional[bool] = False
    en_sala_espera: Optional[bool] = False
    estado: Optional[EstadoCitaStr] = "pendiente"
    veterinario_id: Optional[int] = None


class CitaCreate(CitaBase):
    """Payload para crear una cita."""

    pass


class CitaUpdate(BaseModel):
    """Payload para actualizar una cita (parcial)."""

    fecha: Optional[datetime] = None
    motivo: Optional[str] = Field(None, max_length=200)
    notas: Optional[str] = None
    urgente: Optional[bool] = None
    en_sala_espera: Optional[bool] = None
    estado: Optional[EstadoCitaStr] = None
    veterinario_id: Optional[int] = None


class CitaResponse(CitaBase):
    """Respuesta de una cita."""

    id: int
    veterinario_id: Optional[int] = None
    veterinario_nombre: Optional[str] = None
    mascota_nombre: Optional[str] = Field(default=None, description="Nombre de la mascota (enriquecido en API).")

    model_config = ConfigDict(from_attributes=True)


class CitasDisponibilidadResponse(BaseModel):
    fecha: date
    veterinario_id: int
    disponible: list[str]  # ['08:00', '08:30', ...]
    reservado: list[str]  # slots ocupados dentro de la jornada


class CitaRecurrenteCreate(BaseModel):
    """Crea múltiples citas repetidas en el tiempo."""

    mascota_id: int
    fecha_inicio: datetime
    veterinario_id: int

    motivo: Optional[str] = Field(None, max_length=200)
    notas: Optional[str] = None
    urgente: bool = False

    # Repetición simple (cada N semanas por X repeticiones).
    repeticiones: int = Field(2, ge=2, le=50)
    intervalo_semana: int = Field(1, ge=1, le=12)
    crear_waitlist_en_conflicto: bool = True


class CitaLlegadaCreate(BaseModel):
    """Crea cita por orden de llegada con asignación automática."""

    mascota_id: int
    motivo: Optional[str] = Field(None, max_length=200)
    notas: Optional[str] = None
    urgente: bool = False
    veterinario_preferido_id: Optional[int] = None
    fecha_llegada: Optional[datetime] = None


class CitasRecurrentesResponse(BaseModel):
    created_ids: list[int]
    skipped: list[dict] = []  # [{fecha: 'YYYY-MM-DDTHH:mm:ss', message: '...'}]
    waitlist_ids: list[int] = []


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
