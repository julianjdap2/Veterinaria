from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.formula_schema import FormulaItemCreate


class ConsultaBase(BaseModel):
    mascota_id: int
    motivo_consulta: Optional[str] = None
    diagnostico: Optional[str] = None
    tratamiento: Optional[str] = None
    observaciones: Optional[str] = None
    fecha_consulta: Optional[datetime] = None
    cita_id: Optional[int] = None


class ConsultaCreate(ConsultaBase):
    pass


class ConsultaCreateConFormula(ConsultaCreate):
    formula_items: list[FormulaItemCreate] = []


class ConsultaResponse(ConsultaBase):
    id: int
    veterinario_id: int
    created_at: datetime
    cliente_id: Optional[int] = None  # propietario de la mascota (para ventas)

    model_config = ConfigDict(from_attributes=True)


class ResumenConsultaResponse(BaseModel):
    """Resumen estructurado de una consulta (para mostrar, PDF o email)."""

    consulta_id: int
    fecha_consulta: str
    mascota_nombre: str
    cliente_nombre: str
    cliente_email: str
    veterinario_nombre: str
    motivo_consulta: str
    diagnostico: str
    tratamiento: str
    notas_cita: str
    observaciones: str


class EnviarResumenBody(BaseModel):
    """Opcional: enviar a otro email distinto al del cliente."""

    to_email: Optional[str] = None


class ConsultaParaVentaResponse(BaseModel):
    """Consulta resumida para selector al registrar venta (propietario + consulta)."""

    id: int
    mascota_id: int
    mascota_nombre: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

