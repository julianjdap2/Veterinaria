"""Planes de salud (paquetes) y afiliaciones."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CoberturaCategoriaItem(BaseModel):
    codigo: str
    label: str


class PlanSaludMetaResponse(BaseModel):
    modulo_habilitado: bool
    categorias: list[CoberturaCategoriaItem]
    periodicidades_meses: list[int] = Field(default=[1, 3, 6, 12])


class CoberturaIn(BaseModel):
    categoria_codigo: str = Field(..., min_length=1, max_length=80)
    nombre_servicio: str = Field(..., min_length=1, max_length=200)
    cantidad: int = Field(1, ge=1, le=999)
    cobertura_maxima: Optional[Decimal] = Field(None, ge=0)


class PlanSaludCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    precio: Decimal = Field(Decimal("0"), ge=0)
    periodicidad_meses: int = Field(1, ge=1, le=120)
    especies_ids: list[int] = Field(default_factory=list)
    coberturas: list[CoberturaIn] = Field(default_factory=list)


class PlanSaludUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=200)
    precio: Decimal | None = Field(None, ge=0)
    periodicidad_meses: int | None = Field(None, ge=1, le=120)
    especies_ids: list[int] | None = None
    coberturas: list[CoberturaIn] | None = None
    activo: bool | None = None


class CoberturaResponse(BaseModel):
    id: int
    categoria_codigo: str
    nombre_servicio: str
    cantidad: int
    cobertura_maxima: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class PlanSaludResponse(BaseModel):
    id: int
    empresa_id: int
    nombre: str
    precio: Decimal
    periodicidad_meses: int
    especies_ids: list[int]
    activo: bool
    coberturas: list[CoberturaResponse]
    afiliaciones_activas: int = 0
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ModuloPlanSaludPatch(BaseModel):
    habilitado: bool


class AfiliacionCreate(BaseModel):
    cliente_id: int
    mascota_id: int | None = None
    fecha_inicio: date
    fecha_fin: date | None = None
    valor_pagado: Decimal | None = None
    observaciones: str | None = Field(None, max_length=500)


class AfiliacionUpdate(BaseModel):
    mascota_id: int | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    valor_pagado: Decimal | None = Field(None, ge=0)
    observaciones: str | None = Field(None, max_length=500)


class AfiliacionResponse(BaseModel):
    id: int
    plan_salud_id: int
    cliente_id: int
    cliente_nombre: str | None = None
    cliente_documento: str | None = None
    mascota_id: int | None = None
    mascota_nombre: str | None = None
    fecha_inicio: date
    fecha_fin: date
    valor_pagado: Decimal
    observaciones: str | None = None
    activo: bool
    resumen_usos: str = ""
    created_at: datetime | None = None


class EstadoCuentaLinea(BaseModel):
    nombre_servicio: str
    categoria_codigo: str
    consumidos: int
    limite: int
    cobertura_maxima: Optional[Decimal] = None


class EstadoCuentaResponse(BaseModel):
    clinica_nombre: str
    clinica_direccion: str | None = None
    clinica_telefono: str | None = None
    clinica_email: str | None = None
    plan_numero: str
    titular_documento: str | None = None
    titular_nombre: str | None = None
    mascota_nombre: str | None = None
    plan_nombre: str
    vigencia_desde: date
    vigencia_hasta: date
    lineas: list[EstadoCuentaLinea]


class AfiliacionMascotaActivaResponse(BaseModel):
    """Afiliación vigente a un plan de salud para una mascota (consultorio / ficha)."""

    tiene_afiliacion: bool
    afiliacion_id: int | None = None
    plan_salud_id: int | None = None
    plan_nombre: str | None = None
    fecha_fin: date | None = None
