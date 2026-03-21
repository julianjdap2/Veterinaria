"""Configuración operativa por empresa (tipos de servicio agenda, consecutivo ventas)."""

from pydantic import BaseModel, Field


class TipoServicioCita(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=120)
    duracion_min: int = Field(30, ge=5, le=480)
    allow_urgente: bool = True
    allow_recurrente: bool = True
    categoria: str = Field("general", max_length=80)


class ConfigOperativaResponse(BaseModel):
    tipos_servicio: list[TipoServicioCita]
    venta_prefijo: str
    venta_siguiente_numero: int
    venta_numero_padding: int
    timezone: str | None = None


class ConfigOperativaUpdate(BaseModel):
    tipos_servicio: list[TipoServicioCita] | None = None
    venta_prefijo: str | None = Field(None, max_length=20)
    venta_numero_padding: int | None = Field(None, ge=1, le=12)
